import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getBookingById, updateBookingPaymentLink } from "@/lib/db/bookings"
import { upsertPaymentLinkRecord } from "@/lib/db/payment-links"
import { getModelById } from "@/lib/db/models"
import { getServiceById } from "@/lib/db/services"
import { AppError, AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import logger from "@/lib/logger"
import { createPaymentLink } from "@/lib/mercadopago"
import { enforceRateLimit } from "@/lib/ratelimit"
import { assertTrustedOrigin } from "@/lib/security"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

const schema = z.object({
  bookingId: z.string().min(1),
})

function isPastScheduledDate(iso: string): boolean {
  const scheduledAt = new Date(iso).getTime()
  if (Number.isNaN(scheduledAt)) return false
  return scheduledAt < Date.now()
}

/**
 * POST /api/payments/initiate
 * Creates or reuses a Mercado Pago Checkout Pro preference for a pending booking.
 * Returns { initPoint } - the URL to redirect the user to.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  await enforceRateLimit("paymentUser", session.uid)

  const body: unknown = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos invalidos")
  }

  const { bookingId } = parsed.data

  const booking = await getBookingById(bookingId)
  if (!booking) throw new NotFoundError("Reserva no encontrada")

  if (booking.userId !== session.uid) throw new ForbiddenError()

  if (booking.status !== "pending") {
    throw new ValidationError("Esta reserva no esta pendiente de pago")
  }

  if (isPastScheduledDate(booking.scheduledDate)) {
    throw new ValidationError("No podes generar un link de pago para una reserva vencida")
  }

  if (booking.paymentLinkId && booking.paymentLinkUrl) {
    logger.info(
      { bookingId, preferenceId: booking.paymentLinkId },
      "Reusing existing payment preference"
    )
    return ok({
      initPoint: booking.paymentLinkUrl,
      preferenceId: booking.paymentLinkId,
    })
  }

  const [service, scooterModel] = await Promise.all([
    getServiceById(booking.serviceId),
    getModelById(booking.scooterModelId),
  ])

  if (!service || !scooterModel) {
    throw new NotFoundError("Datos de reserva incompletos")
  }

  let preferenceId: string
  let initPoint: string

  try {
    const paymentLink = await createPaymentLink({
      bookingId: booking.id,
      serviceName: service.name,
      scooterModelName: scooterModel.name,
      serviceFee: booking.serviceFee,
    })
    preferenceId = paymentLink.preferenceId
    initPoint = paymentLink.initPoint

    await updateBookingPaymentLink(booking.id, preferenceId, initPoint)
    await upsertPaymentLinkRecord({
      preferenceId,
      bookingId: booking.id,
      initPoint,
    })
  } catch (err) {
    logger.error({ bookingId, err }, "Failed to create payment preference")
    throw new AppError(
      "Failed to create payment preference",
      "No se pudo generar el link de pago en este momento. Intenta de nuevo en unos minutos.",
      503
    )
  }

  logger.info({ bookingId, preferenceId }, "Payment preference created")

  return ok({ initPoint, preferenceId })
})
