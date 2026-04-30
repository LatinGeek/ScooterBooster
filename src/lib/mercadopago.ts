import { MercadoPagoConfig, Preference } from "mercadopago"
import { calculatePricing } from "@/lib/pricing"
import type { PaymentLink } from "@/types"

interface CreatePaymentLinkParams {
  bookingId: string
  serviceName: string
  scooterModelName: string
  serviceFee: number
}

export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLink> {
  if (process.env.E2E_MOCK_MERCADOPAGO === "1") {
    return {
      preferenceId: `e2e-${params.bookingId}`,
      initPoint: `https://www.mercadopago.com.uy/checkout/v1/redirect?pref_id=e2e-${params.bookingId}`,
    }
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  if (!accessToken) {
    throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN")
  }

  const client = new MercadoPagoConfig({
    accessToken,
  })
  const preference = new Preference(client)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scooterbooster.uy"

  const result = await preference.create({
    body: {
      items: [
        {
          id: params.bookingId,
          title: `Reserva ScooterBooster: ${params.serviceName} - ${params.scooterModelName}`,
          quantity: 1,
          unit_price: params.serviceFee,
          currency_id: "UYU",
        },
      ],
      back_urls: {
        success: `${appUrl}/booking/${params.bookingId}?status=success`,
        failure: `${appUrl}/booking/${params.bookingId}?status=failure`,
        pending: `${appUrl}/booking/${params.bookingId}?status=pending`,
      },
      auto_return: "approved",
      notification_url: `${appUrl}/api/payments/webhook`,
      external_reference: `booking_${params.bookingId}`,
    },
  })

  return {
    preferenceId: result.id!,
    initPoint: result.init_point!,
  }
}

export { calculatePricing }
