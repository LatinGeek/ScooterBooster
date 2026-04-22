import { NextRequest } from "next/server"
import { PaymentRefund, MercadoPagoConfig } from "mercadopago"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { getBookingById, markBookingRefunded } from "@/lib/db/bookings"
import { updatePaymentLinkStatus } from "@/lib/db/payment-links"
import { getTechnicianById } from "@/lib/db/technicians"
import { getServiceById } from "@/lib/db/services"
import { getUserById } from "@/lib/db/users"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { sendBookingCancelledEmail } from "@/lib/notification-emails"
import { notify } from "@/lib/notifications"
import { getSession } from "@/lib/session"
import { assertTrustedOrigin } from "@/lib/security"

const refundSchema = z.object({
  bookingId: z.string().min(1, "La reserva es obligatoria"),
  reason: z.string().trim().max(300).optional(),
})

function formatScheduleLabel(iso: string) {
  return new Date(iso).toLocaleString("es-UY", {
    dateStyle: "full",
    timeStyle: "short",
  })
}

export const POST = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    assertTrustedOrigin(req)

    const session = await getSession()
    if (!session) throw new AuthError()
    if (session.role !== "admin") throw new ForbiddenError()

    const { id: paymentId } = await ctx.params
    const body: unknown = await req.json()
    const parsed = refundSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos invalidos")
    }

    const booking = await getBookingById(parsed.data.bookingId)
    if (!booking) throw new NotFoundError("Reserva no encontrada")
    if (booking.paymentStatus !== "paid") {
      throw new ValidationError("Solo podes reembolsar reservas con pago confirmado")
    }
    if (booking.paymentId !== paymentId) {
      throw new ValidationError("El pago no coincide con la reserva seleccionada")
    }

    const refundClient = new PaymentRefund(
      new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! }),
    )
    const refund = await refundClient.create({ payment_id: paymentId })

    await markBookingRefunded(booking.id)
    if (booking.paymentLinkId) {
      await updatePaymentLinkStatus({
        preferenceId: booking.paymentLinkId,
        status: "refunded",
        paymentId,
      })
    }

    const [user, service, technician] = await Promise.all([
      getUserById(booking.userId),
      getServiceById(booking.serviceId),
      getTechnicianById(booking.technicianId),
    ])

    const reason = parsed.data.reason ?? "El pago fue reembolsado por el equipo de soporte."

    await Promise.allSettled([
      addAuditLogEntry({
        action: "payment_refunded",
        actorUid: session.uid,
        targetType: "booking",
        targetId: booking.id,
        metadata: {
          paymentId,
          refundId: String((refund as { id?: string | number }).id ?? ""),
          reason,
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
              reason,
            }),
          ]
        : []),
    ])

    return ok({
      bookingId: booking.id,
      paymentId,
      refundId: String((refund as { id?: string | number }).id ?? ""),
      paymentStatus: "refunded" as const,
      status: "cancelled_by_user" as const,
    })
  },
)
