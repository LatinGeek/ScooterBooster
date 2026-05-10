import { MercadoPagoConfig, Payment } from "mercadopago"
import { getBookingByExternalReference, setBookingPaymentReference, updateBookingPaymentStatus } from "@/lib/db/bookings"
import { updatePaymentLinkStatus } from "@/lib/db/payment-links"
import logger from "@/lib/logger"
import {
  getMercadoPagoAccessToken,
  getMercadoPagoEnvironmentCandidates,
} from "@/lib/mercadopago-config"

export interface SyncMercadoPagoPaymentResult {
  bookingId: string | null
  paymentId: string
  mpStatus: string | null
  result:
    | "processed"
    | "no_booking"
    | "amount_mismatch"
    | "booking_mismatch"
    | "ignored"
}

export async function syncMercadoPagoPayment(params: {
  paymentId: string
  expectedBookingId?: string
  lastWebhookEventId?: string | null
}): Promise<SyncMercadoPagoPaymentResult> {
  let payment:
    | {
        status?: string | null
        external_reference?: string | null
        transaction_amount?: number | null
      }
    | null = null
  let lastError: unknown = null

  for (const environment of getMercadoPagoEnvironmentCandidates()) {
    const accessToken = getMercadoPagoAccessToken(environment)
    if (!accessToken) continue

    try {
      const mpClient = new MercadoPagoConfig({ accessToken })
      const paymentClient = new Payment(mpClient)
      payment = await paymentClient.get({ id: params.paymentId })
      break
    } catch (error) {
      lastError = error
      logger.warn(
        { paymentId: params.paymentId, environment, err: error },
        "MP payment fetch failed for environment"
      )
    }
  }

  if (!payment) {
    throw lastError instanceof Error ? lastError : new Error("Failed to fetch MercadoPago payment")
  }

  const mpStatus = payment.status ?? null
  const externalRef = payment.external_reference ?? ""
  const transactionAmount =
    typeof payment.transaction_amount === "number" ? payment.transaction_amount : null

  logger.info({ paymentId: params.paymentId, mpStatus, externalRef }, "MP payment fetched")

  const booking = await getBookingByExternalReference(externalRef)
  if (!booking) {
    logger.warn({ externalRef }, "No booking found for MP external_reference")
    return {
      bookingId: null,
      paymentId: params.paymentId,
      mpStatus,
      result: "no_booking",
    }
  }

  if (params.expectedBookingId && booking.id !== params.expectedBookingId) {
    logger.warn(
      {
        paymentId: params.paymentId,
        expectedBookingId: params.expectedBookingId,
        bookingId: booking.id,
      },
      "MercadoPago return payment does not match requested booking"
    )
    return {
      bookingId: booking.id,
      paymentId: params.paymentId,
      mpStatus,
      result: "booking_mismatch",
    }
  }

  await setBookingPaymentReference(booking.id, params.paymentId)

  if (mpStatus === "approved") {
    if (transactionAmount !== null && transactionAmount !== booking.serviceFee) {
      logger.error(
        {
          bookingId: booking.id,
          paymentId: params.paymentId,
          transactionAmount,
          expectedAmount: booking.serviceFee,
        },
        "Approved payment amount does not match booking fee"
      )

      return {
        bookingId: booking.id,
        paymentId: params.paymentId,
        mpStatus,
        result: "amount_mismatch",
      }
    }

    await updateBookingPaymentStatus(booking.id, "paid", "confirmed")
  } else if (mpStatus === "refunded" || mpStatus === "charged_back") {
    await updateBookingPaymentStatus(booking.id, "refunded", "cancelled_by_user")
  } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
    await updateBookingPaymentStatus(booking.id, "pending")
  } else {
    return {
      bookingId: booking.id,
      paymentId: params.paymentId,
      mpStatus,
      result: "ignored",
    }
  }

  if (booking.paymentLinkId) {
    const mappedStatus =
      mpStatus === "approved"
        ? "approved"
        : mpStatus === "refunded" || mpStatus === "charged_back"
          ? "refunded"
          : "rejected"

    await updatePaymentLinkStatus({
      preferenceId: booking.paymentLinkId,
      status: mappedStatus,
      paymentId: params.paymentId,
      lastWebhookEventId: params.lastWebhookEventId ?? null,
    })
  }

  return {
    bookingId: booking.id,
    paymentId: params.paymentId,
    mpStatus,
    result: "processed",
  }
}
