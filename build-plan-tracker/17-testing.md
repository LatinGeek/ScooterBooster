# Tracker — Phase 17: Testing & QA

> Status: PARTIAL - Vitest covers validators, pricing/helpers, and booking business rules
> Last updated: 2026-04-18

## Tasks

- [x] Install Vitest for unit tests
- [x] Unit tests: validators, pricing logic, utility helpers
- [ ] Firestore security rules tests
- [ ] API route tests
- [ ] Install Playwright for E2E
- [ ] E2E: signup → book → pay flow
- [ ] E2E: technician application + admin approval
- [ ] E2E: disclaimer modal enforcement
- [ ] E2E: auth redirect for protected routes
- [ ] Manual QA on mobile (375px) and desktop

## Notes

- Critical test: disclaimer must block booking flow if not accepted
- Critical test: payment flow with MercadoPago sandbox
- Added `vitest.config.ts` with `@` alias resolution and env setup for unit tests
- Current unit coverage includes shared validators plus `calculatePricing`, `formatPrice`, `formatWhatsAppLink`, and `cn`
- Booking disclaimer enforcement and role-based status transitions now live in `src/lib/booking-rules.ts` with direct unit coverage
