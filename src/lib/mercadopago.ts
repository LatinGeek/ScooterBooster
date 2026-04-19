import { MercadoPagoConfig, Preference } from "mercadopago"
import type { PaymentLink } from "@/types"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

interface CreatePaymentLinkParams {
  bookingId: string
  serviceName: string
  scooterModelName: string
  totalPrice: number
}

export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLink> {
  if (process.env.E2E_MOCK_MERCADOPAGO === "1") {
    return {
      preferenceId: `e2e-${params.bookingId}`,
      initPoint: `https://www.mercadopago.com.uy/checkout/v1/redirect?pref_id=e2e-${params.bookingId}`,
    }
  }

  const preference = new Preference(client)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://scooterbooster.uy"

  const result = await preference.create({
    body: {
      items: [
        {
          id: params.bookingId,
          title: `Servicio: ${params.serviceName} - ${params.scooterModelName}`,
          quantity: 1,
          unit_price: params.totalPrice,
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

export function calculatePricing(
  basePrice: number,
  feePercentage: number = parseInt(process.env.SERVICE_FEE_PERCENTAGE || "10")
) {
  const serviceFee = Math.round(basePrice * (feePercentage / 100))
  const totalPrice = basePrice + serviceFee
  return { basePrice, serviceFee, totalPrice, feePercentage }
}
