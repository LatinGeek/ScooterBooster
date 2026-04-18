# Tracker — Phase 09: Payments (MercadoPago)

> Status: ✅ COMPLETE (core flow done; refund endpoint + testing deferred)
> Last updated: 2026-04-18

## Tasks

- [x] MercadoPago Checkout Pro payment link creation (server-side)
  - createPaymentLink() in src/lib/mercadopago.ts (already scaffolded, now wired)
  - Called in POST /api/bookings after booking creation; paymentLinkUrl stored on booking doc
  - Gracefully skipped if MERCADOPAGO_ACCESS_TOKEN not set (dev mode)
- [x] POST /api/payments/initiate — regenerate MP preference for a pending booking
- [x] Webhook handler POST /api/payments/webhook
  - HMAC signature verification via x-signature header
  - Idempotency: events stored in `webhookEvents` Firestore collection
  - approved → booking confirmed + paymentStatus paid
  - rejected/cancelled → booking stays pending (user can retry)
  - refunded/charged_back → booking cancelled_by_user + paymentStatus refunded
- [x] Update booking status on payment events (via updateBookingPaymentStatus DAL method)
- [x] Return pages: /booking/[id]?status=success|failure|pending (banner in BookingDetailClient)
- [x] Fee calculation server-side only (calculatePricing in mercadopago.ts)
- [x] Wizard redirects to MP initPoint after booking creation
- [ ] Refund endpoint POST /api/payments/[id]/refund (admin only) — deferred to Phase 13 admin panel
- [ ] Test with sandbox credentials — needs MERCADOPAGO_ACCESS_TOKEN in .env.local
- [ ] Webhook secret setup — needs MERCADOPAGO_WEBHOOK_SECRET after registering webhook URL in MP panel

## Notes

- MERCADOPAGO_WEBHOOK_SECRET added to .env.example with instructions
- If secret not set, webhook verification is skipped with a warning log (dev convenience)
- Idempotency key = webhook event `id` field (not bookingId) — more precise
- webhookEvents Firestore collection used for deduplication
- Sandbox credentials needed from Germán to test end-to-end (Phase 00 credential gap)
