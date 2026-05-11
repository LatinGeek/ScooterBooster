import { NextRequest } from "next/server"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getBookingById, updateBookingStatus } from "@/lib/db/bookings"
import { createReview, getReviewByBooking, getReviewsByTechnician } from "@/lib/db/reviews"
import { AuthError, ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import logger from "@/lib/logger"
import { enforceRateLimit } from "@/lib/ratelimit"
import { canUserReviewBooking, isBookingOverdueForUserReview } from "@/lib/review-eligibility"
import { sanitizePlainText } from "@/lib/sanitize"
import { assertTrustedOrigin } from "@/lib/security"
import { getSession } from "@/lib/session"
import { createReviewSchema } from "@/lib/validators/review"

export const dynamic = "force-dynamic"

/** GET /api/reviews?technicianId=xxx - fetch reviews for a technician */
export const GET = withErrorHandling(async (req: NextRequest) => {
  const technicianId = req.nextUrl.searchParams.get("technicianId")
  if (!technicianId) {
    throw new ValidationError("Se requiere el parámetro technicianId")
  }
  const reviews = await getReviewsByTechnician(technicianId)
  return ok(reviews)
})

/** POST /api/reviews - submit a review for a completed or overdue paid booking */
export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  await enforceRateLimit("reviewUser", session.uid)

  const rawBody = (await req.json()) as Record<string, unknown>
  const body: unknown = {
    ...rawBody,
    comment:
      typeof rawBody.comment === "string" ? sanitizePlainText(rawBody.comment) : rawBody.comment,
  }
  const parsed = createReviewSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const { bookingId, technicianId, rating, comment } = parsed.data

  const booking = await getBookingById(bookingId)
  if (!booking) throw new NotFoundError("Reserva no encontrada")

  if (booking.userId !== session.uid) throw new ForbiddenError()

  if (!canUserReviewBooking(booking)) {
    throw new ValidationError(
      "Solo podés dejar una reseña cuando el servicio esté completado o haya pasado más de un día del turno",
    )
  }

  if (booking.technicianId !== technicianId) {
    throw new ValidationError("El técnico no corresponde a esta reserva")
  }

  const existing = await getReviewByBooking(bookingId)
  if (existing) {
    throw new ConflictError()
  }

  logger.info({ userId: session.uid, bookingId, technicianId, rating }, "Creating review")

  if (booking.status !== "completed" && isBookingOverdueForUserReview(booking)) {
    await updateBookingStatus(booking.id, "completed")
  }

  const review = await createReview({
    bookingId,
    userId: session.uid,
    technicianId,
    rating,
    comment,
  })

  return ok({ review }, 201)
})
