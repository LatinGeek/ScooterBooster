# Tracker — Phase 08: Booking Flow

> Status: ⬜ NOT STARTED
> Last updated: 2026-04-17

## Tasks

- [ ] 5-step booking wizard: scooter → service → technician → date/time → confirm
- [ ] Pricing breakdown display (base + 10% fee = total)
- [ ] Service-compatibility checks (block incompatible combos)
- [ ] Disclaimer enforcement before confirming speed-limit service
- [ ] Double-booking prevention via Firestore transaction
- [ ] Booking status state machine: pending_payment → confirmed → in_progress → completed → cancelled
- [ ] Cancellation flow with policy display
- [ ] API route /api/bookings fully implemented

## Notes

- Booking schema documented in knowledge-base/integrations/firebase-schema.md
- Service fee calculation in src/lib/mercadopago.ts already exists
- Page shells exist at src/app/(main)/booking/
