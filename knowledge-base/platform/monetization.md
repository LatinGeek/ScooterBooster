# ScooterBooster — Monetization Model

## Revenue Model: Service Fee

ScooterBooster charges a **service fee** added on top of the technician's base price. The fee is paid by the user as part of their total.

### How It Works

```
Technician Base Price:  $1,500 UYU
Service Fee (10%):      $  150 UYU
─────────────────────────────────
Total Charged to User:  $1,650 UYU

Technician Receives:    $1,500 UYU
ScooterBooster Keeps:   $  150 UYU
```

### Configuration

- **Default fee:** 10%
- **Stored in:** Environment variable `SERVICE_FEE_PERCENTAGE`
- **Future:** Move to Firebase Remote Config for dynamic updates without redeployment

### Calculation Formula

```typescript
function calculatePricing(basePrice: number, feePercentage: number = 10) {
  const serviceFee = Math.round(basePrice * (feePercentage / 100))
  const totalPrice = basePrice + serviceFee
  return { basePrice, serviceFee, totalPrice }
}
```

## Payment Flow (MercadoPago)

### Overview

We use MercadoPago's **Payment Link (Preference)** API to generate one-time payment links. The user is redirected to MercadoPago to complete payment, then redirected back to ScooterBooster.

### Flow

1. User submits booking → API creates booking in Firestore with `paymentStatus: "pending"`
2. API creates a MercadoPago preference with the total amount
3. API returns the `init_point` URL (payment link) to the frontend
4. Frontend redirects user to MercadoPago checkout
5. User completes payment on MercadoPago
6. MercadoPago sends webhook notification to our API
7. API updates booking `paymentStatus: "paid"` and `status: "confirmed"`
8. User sees confirmation on return URL

### MercadoPago Preference Structure

```json
{
  "items": [
    {
      "title": "Servicio: Eliminación de límite de velocidad - Xiaomi Mi Pro 2",
      "quantity": 1,
      "unit_price": 1650,
      "currency_id": "UYU"
    }
  ],
  "back_urls": {
    "success": "https://scooterbooster.uy/booking/{id}?status=success",
    "failure": "https://scooterbooster.uy/booking/{id}?status=failure",
    "pending": "https://scooterbooster.uy/booking/{id}?status=pending"
  },
  "auto_return": "approved",
  "notification_url": "https://scooterbooster.uy/api/payments/webhook",
  "external_reference": "booking_{bookingId}"
}
```

## Pricing Display Rules

- Always show prices in **UYU** (Uruguayan Pesos)
- Always show the breakdown: base price + service fee = total
- Use the format: `$1.650` (dot as thousands separator, as is standard in Uruguay)
- Show "IVA incluido" (VAT included) if applicable

## Future Revenue Streams (Not MVP)

- Premium technician listings (featured placement)
- Subscription plans for frequent users
- Sponsored scooter brand placements
- Insurance partnerships
