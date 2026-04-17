# ScooterBooster — MercadoPago Integration

## Overview

ScooterBooster uses MercadoPago's **Checkout Pro** (Payment Preferences API) to generate payment links. This is the simplest integration level — no embedded checkout SDK required.

## Flow

```
1. User submits booking
   └── Frontend sends POST /api/bookings

2. API creates booking in Firestore (paymentStatus: "pending")
   └── API calls MercadoPago Create Preference

3. MercadoPago returns preference with init_point URL
   └── API stores paymentLinkUrl in booking doc
   └── API returns init_point URL to frontend

4. Frontend redirects user to MercadoPago checkout
   └── User pays on MercadoPago (card, bank, wallet, etc.)

5. MercadoPago redirects user back to ScooterBooster
   └── back_urls.success → /booking/{id}?status=success
   └── back_urls.failure → /booking/{id}?status=failure
   └── back_urls.pending → /booking/{id}?status=pending

6. MercadoPago sends webhook to /api/payments/webhook
   └── API verifies payment status
   └── API updates booking: paymentStatus = "paid", status = "confirmed"
```

## API Implementation

### Create Preference (Server-Side)

```typescript
// src/lib/mercadopago.ts
import { MercadoPagoConfig, Preference } from "mercadopago"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function createPaymentLink(booking: {
  id: string
  serviceName: string
  scooterModelName: string
  totalPrice: number
}) {
  const preference = new Preference(client)

  const result = await preference.create({
    body: {
      items: [
        {
          id: booking.id,
          title: `Servicio: ${booking.serviceName} - ${booking.scooterModelName}`,
          quantity: 1,
          unit_price: booking.totalPrice,
          currency_id: "UYU",
        },
      ],
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.id}?status=success`,
        failure: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.id}?status=failure`,
        pending: `${process.env.NEXT_PUBLIC_APP_URL}/booking/${booking.id}?status=pending`,
      },
      auto_return: "approved",
      notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/webhook`,
      external_reference: `booking_${booking.id}`,
    },
  })

  return {
    preferenceId: result.id,
    initPoint: result.init_point, // This is the payment URL
  }
}
```

### Webhook Handler

```typescript
// src/app/api/payments/webhook/route.ts
import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"

export async function POST(request: NextRequest) {
  const body = await request.json()

  if (body.type === "payment") {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
    })
    const payment = new Payment(client)
    const paymentData = await payment.get({ id: body.data.id })

    if (paymentData.status === "approved") {
      // Extract booking ID from external_reference
      const bookingId = paymentData.external_reference?.replace("booking_", "")
      // Update booking in Firestore
      // ... update paymentStatus to "paid" and status to "confirmed"
    }
  }

  return NextResponse.json({ success: true })
}
```

## MercadoPago Account Requirements

- **Country:** Uruguay (UY)
- **Currency:** UYU (Uruguayan Peso)
- **Account type:** MercadoPago Business account
- **Credentials needed:**
  - Access Token (server-side, secret)
  - Public Key (client-side, for hosted checkout)

## Testing

- Use MercadoPago **sandbox** credentials for development
- Test cards: see [MercadoPago testing docs](https://www.mercadopago.com.uy/developers/en/docs/checkout-pro/additional-content/your-integrations/test/cards)
- Webhook testing: use ngrok or similar tunnel for local development

## Environment Variables

```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxx     # Server-side secret
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxx       # Client-side public
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxx  # Exposed to client
```
