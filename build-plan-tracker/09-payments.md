# Tracker - Phase 09: Payments (MercadoPago)

> Status: COMPLETE - checkout handoff, webhook reconciliation, and admin refunds now work in dev
> Last updated: 2026-04-20

## Tasks

- [x] MercadoPago Checkout Pro payment link creation (server-side)
  - `createPaymentLink()` in `src/lib/mercadopago.ts`
  - Called in `POST /api/bookings` after booking creation; `paymentLinkUrl` stored on the booking document
  - Gracefully skipped if `MERCADOPAGO_ACCESS_TOKEN` is not set (dev fallback)
- [x] `POST /api/payments/initiate` regenerates a preference for a pending booking
- [x] Webhook handler `POST /api/payments/webhook`
  - HMAC signature verification via `x-signature`
  - Idempotency via `webhookEvents` Firestore collection
  - `approved` -> booking `confirmed` plus `paymentStatus=paid`
  - `rejected` / `cancelled` -> booking stays pending so the user can retry
  - `refunded` / `charged_back` -> booking `cancelled_by_user` plus `paymentStatus=refunded`
- [x] Booking payment metadata is persisted on webhook reconciliation
  - `paymentId` is now stored on the booking document so admin refunds can target the exact MercadoPago payment
- [x] Return pages: `/booking/[id]?status=success|failure|pending` via booking detail banners
- [x] Fee calculation stays server-side only in `calculatePricing()`
- [x] Wizard redirects to the MercadoPago `init_point` after booking creation
- [x] Payment webhooks audit-log each processed event and trigger user-facing confirmation/cancellation notifications
- [x] Refund endpoint `POST /api/payments/[id]/refund` (admin only)
- [x] Admin refund operations UI in `/admin/bookings`
- [ ] Sandbox approval / rejection / pending card matrix still needs a fully hosted callback smoke test
- [ ] Webhook secret setup still depends on final deployed webhook registration in MercadoPago

## Notes

- `MERCADOPAGO_WEBHOOK_SECRET` is documented in `.env.example`
- If the secret is not set, webhook verification is skipped with a warning log as a dev-only convenience
- Webhook idempotency key = MercadoPago webhook `id` field (not booking id)
- `paymentId` persistence on the booking document closes the gap between webhook reconciliation and admin-initiated refunds
