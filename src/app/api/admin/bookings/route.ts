import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { getBookingById, getAllBookings, updateBookingStatus } from "@/lib/db/bookings"
import { getTechnicianById } from "@/lib/db/technicians"
import { getServiceById } from "@/lib/db/services"
import { getUserById } from "@/lib/db/users"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { sendBookingCancelledEmail } from "@/lib/notification-emails"
import { notify } from "@/lib/notifications"
import { getSession } from "@/lib/session"
import { assertTrustedOrigin } from "@/lib/security"

const patchSchema = z.object({
  id: z.string().min(1, "La reserva es obligatoria"),
  action: z.enum(["cancel"], { error: "Accion invalida" }),
  reason: z.string().trim().max(300).optional(),
})

function formatScheduleLabel(iso: string) {
  return new Date(iso).toLocaleString("es-UY", {
    dateStyle: "full",
    timeStyle: "short",
  })
}

export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  return ok(await getAllBookings())
})

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body: unknown = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos invalidos")
  }

  const booking = await getBookingById(parsed.data.id)
  if (!booking) throw new NotFoundError("Reserva no encontrada")

  if (["cancelled_by_user", "cancelled_by_technician", "completed", "expired"].includes(booking.status)) {
    throw new ValidationError("Esta reserva ya no puede cancelarse desde el panel admin")
  }

  if (booking.paymentStatus === "paid") {
    throw new ValidationError("Primero procesa el reembolso antes de cancelar una reserva paga")
  }

  await updateBookingStatus(booking.id, "cancelled_by_user")

  const [user, service, technician] = await Promise.all([
    getUserById(booking.userId),
    getServiceById(booking.serviceId),
    getTechnicianById(booking.technicianId),
  ])

  await Promise.allSettled([
    addAuditLogEntry({
      action: "admin_booking_cancelled",
      actorUid: session.uid,
      targetType: "booking",
      targetId: booking.id,
      metadata: {
        reason: parsed.data.reason ?? "Cancelada desde el panel admin",
        previousStatus: booking.status,
        paymentStatus: booking.paymentStatus,
      },
    }),
    notify({
      type: "bookingStatusChanged",
      userId: booking.userId,
      bookingId: booking.id,
      newStatus: "cancelled_by_user",
    }),
    ...(user?.email && service && technician
      ? [
          sendBookingCancelledEmail({
            to: user.email,
            bookingId: booking.id,
            serviceName: service.name,
            technicianName: technician.displayName,
            scheduledDate: formatScheduleLabel(booking.scheduledDate),
            reason: parsed.data.reason ?? "La reserva fue cancelada por el equipo de soporte.",
          }),
        ]
      : []),
  ])

  return ok({ id: booking.id, status: "cancelled_by_user" as const })
})
