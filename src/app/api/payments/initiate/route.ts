import { NextRequest } from "next/server"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getSession } from "@/lib/session"
import { getBookingById, updateBookingPaymentLink } from "@/lib/db/bookings"
import { getServiceById } from "@/lib/db/services"
import { getModelById } from "@/lib/db/models"
import { createPaymentLink } from "@/lib/mercadopago"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import logger from "@/lib/logger"
import { enforceRateLimit } from "@/lib/ratelimit"
import { assertTrustedOrigin } from "@/lib/security"
import { z } from "zod"

export const dynamic = "force-dynamic"

const schema = z.object({
  bookingId: z.string().min(1),
})

/**
 * POST /api/payments/initiate
 * Creates (or re-creates) a MercadoPago Checkout Pro preference for a pending booking.
 * Returns { initPoint } — the URL to redirect the user to.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  await enforceRateLimit("paymentUser", session.uid)

  const body: unknown = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const { bookingId } = parsed.data

  const booking = await getBookingById(bookingId)
  if (!booking) throw new NotFoundError("Reserva no encontrada")

  // Only the booking owner can initiate payment
  if (booking.userId !== session.uid) throw new ForbiddenError()

  // Only pending bookings can be paid
  if (booking.status !== "pending") {
    throw new ValidationError("Esta reserva no está pendiente de pago")
  }

  // Fetch related data for the preference title
  const [service, scooterModel] = await Promise.all([
    getServiceById(booking.serviceId),
    getModelById(booking.scooterModelId),
  ])

  if (!service || !scooterModel) {
    throw new NotFoundError("Datos de reserva incompletos")
  }

  const { preferenceId, initPoint } = await createPaymentLink({
    bookingId: booking.id,
    serviceName: service.name,
    scooterModelName: scooterModel.name,
    totalPrice: booking.totalPrice,
  })

  await updateBookingPaymentLink(booking.id, preferenceId, initPoint)

  logger.info({ bookingId, preferenceId }, "Payment preference (re)created")

  return ok({ initPoint, preferenceId })
})
