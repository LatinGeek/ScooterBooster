# Tracker — Phase 08: Booking Flow

> Status: ✅ COMPLETE (core flows done; payment link generation deferred to Phase 09)
> Last updated: 2026-04-18

## Tasks

- [x] 5-step booking wizard: scooter → service → technician → date/time → confirm
  - /booking/new/page.tsx + booking-wizard.tsx (client component)
  - URL param persistence for refresh-safety (step, model, service, technician, date)
- [x] Pricing breakdown display (base + 10% fee = total) — shown from step 3 onward
- [x] Service-compatibility checks (block incompatible combos) — enforced in API and UI
- [x] Disclaimer enforcement before confirming speed-limit service — DisclaimerModal triggered at step 4→5
- [x] Double-booking prevention via Firestore transaction — createBooking() checks for conflicting slots
- [x] Booking status state machine — updated to full 7-state machine:
  - pending | confirmed | in_progress | completed | cancelled_by_user | cancelled_by_technician | expired
- [x] Cancellation flow — user can cancel pending bookings via PATCH with role/transition checks
- [x] API route /api/bookings fully implemented (POST + GET /api/bookings)
- [x] API route /api/bookings/[id] — GET (auth, role-based access) + PATCH (role-based transitions)
- [x] Booking detail page — /booking/[id]/page.tsx + booking-detail-client.tsx
  - Status badge, details, pricing, payment status, action CTAs, WhatsApp contact
  - Payment return banner (?status=success|failure|pending from MercadoPago redirect)

## Deferred

- [ ] Payment link URL (paymentLinkUrl) — generated in Phase 09 after booking creation
- [ ] Email notification stub — Phase 14
- [ ] Cancellation policy UI/copy — Phase 14/16
- [ ] /api/bookings/[id]/cancel dedicated endpoint — merged into PATCH for simplicity

## Notes

- BookingStatus changed from "cancelled" to "cancelled_by_user" | "cancelled_by_technician" (more precise for tech dashboard)
- NotFoundError + ValidationError constructors now accept Spanish user-facing messages directly
- Build: ✓ Compiled (25.5s), ✓ TypeScript (8.7s), 19 pages generated
- EPERM on build cleanup is FUSE sandbox artifact only — not a real build failure (see learnings.md)
- /booking/page.tsx redirects to /booking/new
- next.config.ts updated to use distDir: "/tmp/sb-build" to avoid FUSE lock file collisions on rebuild
