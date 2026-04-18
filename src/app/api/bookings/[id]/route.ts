import { NextRequest } from "next/server"
import { ok, fail, withErrorHandling } from "@/lib/api-response"
import { canTransitionBookingStatus, canUserCancelBooking } from "@/lib/booking-rules"
import { getSession } from "@/lib/session"
import { getBookingById, updateBookingStatus } from "@/lib/db/bookings"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { z } from "zod"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled_by_user",
    "cancelled_by_technician",
    "expired",
  ]),
})

/** GET /api/bookings/[id] — owner, technician, or admin only */
export const GET = withErrorHandling(async (_req: NextRequest, { params }: RouteParams) => {
  const session = await getSession()
  if (!session) throw new AuthError()

  const { id } = await params
  const booking = await getBookingById(id)
  if (!booking) throw new NotFoundError("Reserva no encontrada")

  const role = (session["role"] as string | undefined) ?? "user"

  // Access control
  if (role === "admin") {
    return ok(booking)
  }
  if (role === "technician") {
    const techProfile = await getTechnicianByUserId(session.uid)
    if (techProfile?.id === booking.technicianId) return ok(booking)
    throw new ForbiddenError()
  }
  // Regular user
  if (booking.userId === session.uid) return ok(booking)
  throw new ForbiddenError()
})

/** PATCH /api/bookings/[id] — update booking status with role-based transitions */
export const PATCH = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  const session = await getSession()
  if (!session) throw new AuthError()

  const { id } = await params
  const booking = await getBookingById(id)
  if (!booking) throw new NotFoundError("Reserva no encontrada")

  const body: unknown = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Estado inválido")
  }

  const { status: newStatus } = parsed.data
  const role = (session["role"] as string | undefined) ?? "user"
  const currentStatus = booking.status

  let allowed = false

  if (role === "admin") {
    allowed = canTransitionBookingStatus("admin", currentStatus, newStatus)
  } else if (role === "technician") {
    const techProfile = await getTechnicianByUserId(session.uid)
    if (techProfile?.id !== booking.technicianId) throw new ForbiddenError()
    allowed = canTransitionBookingStatus("technician", currentStatus, newStatus)
  } else {
    // user role
    if (booking.userId !== session.uid) throw new ForbiddenError()

    // Cancellation window: free up to 24h before scheduled time
    if (newStatus === "cancelled_by_user") {
      if (!canUserCancelBooking(booking)) {
        throw new ValidationError("No es posible cancelar una reserva pasada")
      }
    }
    allowed = canTransitionBookingStatus("user", currentStatus, newStatus)
  }

  if (!allowed) {
    throw new ValidationError(
      `No es posible cambiar el estado de "${currentStatus}" a "${newStatus}"`
    )
  }

  await updateBookingStatus(id, newStatus as import("@/types").BookingStatus)
  const updated = await getBookingById(id)
  return ok(updated)
})
