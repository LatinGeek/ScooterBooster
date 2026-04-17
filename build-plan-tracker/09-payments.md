# Tracker — Phase 09: Payments (MercadoPago)

> Status: ⬜ NOT STARTED
> Last updated: 2026-04-17

## Tasks

- [ ] MercadoPago Checkout Pro payment link creation (server-side)
- [ ] Webhook handler (/api/payments) with signature verification + idempotency
- [ ] Update booking status on payment events (paid/failed/pending)
- [ ] Return pages: /booking/[id]?status=success|failure|pending
- [ ] Fee calculation server-side only (never trust client)
- [ ] Refund workflow for admins
- [ ] Test with sandbox credentials before prod

## Notes

- MercadoPago integration documented in knowledge-base/integrations/mercadopago.md
- mercadopago.ts already scaffolded with payment link creation
- Webhook signature must be verified — never process unsigned webhooks
- Idempotency key = bookingId to prevent double-processing
- Use TEST credentials for all dev/preview environments
