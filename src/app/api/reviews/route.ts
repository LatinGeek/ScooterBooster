import { NextRequest } from "next/server"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getSession } from "@/lib/session"
import { createReviewSchema } from "@/lib/validators/review"
import { createReview, getReviewByBooking, getReviewsByTechnician } from "@/lib/db/reviews"
import { getBookingById } from "@/lib/db/bookings"
import { AuthError, ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors"
import logger from "@/lib/logger"
import { assertTrustedOrigin } from "@/lib/security"

export const dynamic = "force-dynamic"

/** GET /api/reviews?technicianId=xxx — fetch reviews for a technician */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const technicianId = req.nextUrl.searchParams.get("technicianId")
  if (!technicianId) {
    throw new ValidationError("Se requiere el parámetro technicianId")
  }
  const reviews = await getReviewsByTechnician(technicianId)
  return ok(reviews)
})

/** POST /api/reviews — submit a review for a completed booking */
export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()

  const body: unknown = await req.json()
  const parsed = createReviewSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const { bookingId, technicianId, rating, comment } = parsed.data

  // Verify the booking exists
  const booking = await getBookingById(bookingId)
  if (!booking) throw new NotFoundError("Reserva no encontrada")

  // Only the booking owner can leave a review
  if (booking.userId !== session.uid) throw new ForbiddenError()

  // Booking must be completed
  if (booking.status !== "completed") {
    throw new ValidationError("Solo podés dejar una reseña cuando el servicio esté completado")
  }

  // Technician must match the booking
  if (booking.technicianId !== technicianId) {
    throw new ValidationError("El técnico no corresponde a esta reserva")
  }

  // No duplicate reviews per booking
  const existing = await getReviewByBooking(bookingId)
  if (existing) {
    throw new ConflictError()
  }

  logger.info({ userId: session.uid, bookingId, technicianId, rating }, "Creating review")

  const review = await createReview({
    bookingId,
    userId: session.uid,
    technicianId,
    rating,
    comment,
  })

  return ok({ review }, 201)
})
