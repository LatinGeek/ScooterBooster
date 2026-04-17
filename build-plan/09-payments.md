# Phase 09 — Payments (MercadoPago)

> **Goal:** Generate MercadoPago payment links for bookings, process webhooks, reconcile status.

## 9.1 — MercadoPago Account Setup

- [ ] Create MercadoPago Uruguay account (or use existing Mi Mercado account)
- [ ] Get **test** access token and public key
- [ ] Document test cards in `knowledge-base/integrations/mercadopago.md`
- [ ] Get **prod** credentials for Phase 21

## 9.2 — Payment Link Helper

- [ ] Implement `createPaymentLink(booking)` in `src/lib/mercadopago.ts`:
  - Uses Preferences API (Checkout Pro)
  - `back_urls`: `/booking/{id}/success`, `/booking/{id}/failure`, `/booking/{id}/pending`
  - `notification_url`: `/api/payments/webhook`
  - `external_reference`: booking ID
  - Currency: UYU
  - Expiration: 1 hour after creation
- [ ] Store MP preference ID + `init_point` in `paymentLinks` collection

## 9.3 — Initiate Payment Endpoint

- [ ] `POST /api/payments/initiate` with `{ bookingId }`
- [ ] Verifies user owns booking and status is `pending_payment`
- [ ] Creates preference if not exists, returns `init_point` URL
- [ ] Client redirects to that URL

## 9.4 — Webhook Handler

- [ ] `POST /api/payments/webhook`
- [ ] Verify MP signature (`x-signature` header) — validate HMAC
- [ ] Idempotency: store `eventId` and skip duplicates
- [ ] On `payment.updated`: fetch payment details via MP API, update booking status:
  - `approved` → booking `confirmed`
  - `rejected` / `cancelled` → booking stays `pending_payment`, user can retry
  - `refunded` → booking `cancelled_by_user`
- [ ] Log every event to `auditLog`

## 9.5 — Return Pages

- [ ] `/booking/[id]/success` — thank-you page, show booking summary
- [ ] `/booking/[id]/failure` — retry CTA
- [ ] `/booking/[id]/pending` — explain pending states, show refresh button

## 9.6 — Fee Calculation

- [ ] Server-side only: `calculatePricing(basePrice, feePercentage)` returns `{ basePrice, feeAmount, totalAmount }`
- [ ] Read `SERVICE_FEE_PERCENTAGE` from env (default 10)
- [ ] Round to 2 decimals, always in UYU
- [ ] Never trust client-provided amounts

## 9.7 — Refunds

- [ ] `POST /api/payments/[id]/refund` (admin only)
- [ ] Calls MP Refund API
- [ ] Updates booking, logs to `auditLog`

## 9.8 — Technician Payout (Out of Scope for MVP)

- [ ] Track `technicianEarnings` on each completed booking
- [ ] Weekly payout report in admin panel (manual settlement for MVP)
- [ ] Document payout policy in `knowledge-base/platform/monetization.md`

## 9.9 — Testing

- [ ] Use MP test cards to walk through: approved, rejected, pending
- [ ] Verify webhook signature verification with bad payload → 401
- [ ] Verify idempotency on duplicate webhook
- [ ] Load-test webhook endpoint

## Exit Criteria

- [ ] User can complete payment in MP sandbox
- [ ] Booking flips to `confirmed` after webhook
- [ ] Refunds work via admin panel
- [ ] All payment events logged in `auditLog`
- [ ] Signature verification enforced
