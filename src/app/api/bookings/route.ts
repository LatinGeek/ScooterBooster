import { NextRequest } from "next/server"
import { after } from "next/server"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getSession } from "@/lib/session"
import { createBookingSchema } from "@/lib/validators/booking"
import { createBooking, getBookingsByUser, updateBookingPaymentLink } from "@/lib/db/bookings"
import { upsertPaymentLinkRecord } from "@/lib/db/payment-links"
import { getTechnicianById } from "@/lib/db/technicians"
import { getServiceById } from "@/lib/db/services"
import { getModelById } from "@/lib/db/models"
import { getUserById } from "@/lib/db/users"
import { getPlatformSettings } from "@/lib/db/platform-settings"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { requiresBookingDisclaimer } from "@/lib/booking-rules"
import { calculatePricing, createPaymentLink } from "@/lib/mercadopago"
import {
  getTechnicianBookingPrice,
  isTechnicianCompatibleForBooking,
} from "@/lib/technician-matrix"
import { ValidationError, AuthError, NotFoundError } from "@/lib/errors"
import logger from "@/lib/logger"
import { enforceRateLimit } from "@/lib/ratelimit"
import { assertTrustedOrigin } from "@/lib/security"
import { notify } from "@/lib/notifications"
import { sendBookingCreatedEmail } from "@/lib/notification-emails"
import { formatPrice } from "@/lib/utils"

export const dynamic = "force-dynamic"

/** GET /api/bookings — fetch current user's bookings */
export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) throw new AuthError()

  const bookings = await getBookingsByUser(session.uid)
  return ok(bookings)
})

/** POST /api/bookings — create a new booking */
export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  await enforceRateLimit("bookingUser", session.uid)

  const body: unknown = await req.json()
  const parsed = createBookingSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const { technicianId, serviceId, scooterModelId, scheduledDate, notes, disclaimerAccepted } =
    parsed.data

  // Verify technician exists and is approved
  const technician = await getTechnicianById(technicianId)
  if (!technician || !technician.isApproved || !technician.isActive) {
    throw new NotFoundError("Técnico no disponible")
  }

  // Verify service exists and is active
  const service = await getServiceById(serviceId)
  if (!service || !service.isActive) {
    throw new NotFoundError("Servicio no encontrado")
  }

  // Verify scooter model exists
  const scooterModel = await getModelById(scooterModelId)
  if (!scooterModel || !scooterModel.isActive) {
    throw new NotFoundError("Modelo de scooter no encontrado")
  }

  // Verify service is compatible with scooter model
  if (!scooterModel.compatibleServices.includes(serviceId)) {
    throw new ValidationError(
      "Este servicio no es compatible con el modelo de scooter seleccionado"
    )
  }

  // Verify technician supports this exact service x model combination
  if (!isTechnicianCompatibleForBooking(technician, serviceId, scooterModelId, scooterModel.brandId)) {
    throw new ValidationError("El técnico no ofrece este servicio para este modelo")
  }

  // Enforce disclaimer for speed-limit services
  if (requiresBookingDisclaimer(service) && !disclaimerAccepted) {
    throw new ValidationError("Debe aceptar el aviso legal para continuar con este servicio")
  }

  // Get base price from technician pricing
  const basePrice = getTechnicianBookingPrice(technician, serviceId, scooterModelId)
  if (basePrice === null) {
    throw new ValidationError("El servicio no está disponible para este modelo")
  }
  const platformSettings = await getPlatformSettings()
  const { serviceFee, totalPrice } = calculatePricing(basePrice, platformSettings.serviceFeeAmount)

  logger.info({ userId: session.uid, technicianId, serviceId, scheduledDate }, "Creating booking")

  let booking
  try {
    booking = await createBooking({
      userId: session.uid,
      technicianId,
      serviceId,
      scooterModelId,
      scheduledDate,
      notes: notes ?? null,
      basePrice,
      serviceFee,
      totalPrice,
      disclaimerAccepted: !!disclaimerAccepted,
      disclaimerAcceptedAt: disclaimerAccepted ? new Date().toISOString() : null,
      disclaimerVersion: disclaimerAccepted ? "1.0" : null,
    })
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      throw new ValidationError(
        "El técnico ya tiene una reserva en ese horario. Por favor elegí otro horario."
      )
    }
    throw err
  }

  // Generate MercadoPago payment link (skip gracefully if MP not configured in dev)
  let paymentLinkUrl: string | null = null
  if (process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.E2E_MOCK_MERCADOPAGO === "1") {
    try {
      const { preferenceId, initPoint } = await createPaymentLink({
        bookingId: booking.id,
        serviceName: service.name,
        scooterModelName: scooterModel.name,
        serviceFee: booking.serviceFee,
      })
      await updateBookingPaymentLink(booking.id, preferenceId, initPoint)
      await upsertPaymentLinkRecord({
        preferenceId,
        bookingId: booking.id,
        initPoint,
      })
      paymentLinkUrl = initPoint
      logger.info({ bookingId: booking.id, preferenceId }, "MercadoPago preference created")
    } catch (mpErr) {
      // Don't fail the booking if MP is unavailable — user can retry payment later
      logger.error({ bookingId: booking.id, err: mpErr }, "Failed to create MP preference")
    }
  }

  after(async () => {
    const user = await getUserById(session.uid)
    const requestIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      null
    const userAgent = req.headers.get("user-agent") ?? null

    await Promise.allSettled([
      notify({
        type: "bookingCreated",
        userId: session.uid,
        bookingId: booking.id,
        serviceName: service.name,
        serviceFee: booking.serviceFee,
      }),
      addAuditLogEntry({
        action: "booking_created",
        actorUid: session.uid,
        targetType: "booking",
        targetId: booking.id,
        metadata: {
          technicianId,
          serviceId,
          scooterModelId,
          scheduledDate,
          paymentLinkCreated: Boolean(paymentLinkUrl),
        },
      }),
      ...(disclaimerAccepted
        ? [
            addAuditLogEntry({
              action: "disclaimer_accepted",
              actorUid: session.uid,
              targetType: "booking",
              targetId: booking.id,
              metadata: {
                serviceId,
                userAgent,
                ip: requestIp,
              },
            }),
          ]
        : []),
      ...(user?.email
        ? [
            sendBookingCreatedEmail({
              to: user.email,
              bookingId: booking.id,
              serviceName: service.name,
              technicianName: technician.displayName,
              scheduledDate: new Date(booking.scheduledDate).toLocaleString("es-UY", {
                dateStyle: "full",
                timeStyle: "short",
              }),
              serviceFee: formatPrice(booking.serviceFee),
              technicianPrice: formatPrice(booking.basePrice),
            }),
          ]
        : []),
    ])
  })

  return ok({ booking: { ...booking, paymentLinkUrl }, paymentLinkUrl }, 201)
})
