# Tracker — Phase 17: Testing & QA

> Status: PARTIAL - Vitest covers booking, user, technician, and review handlers plus Playwright smoke checks
> Last updated: 2026-04-19

## Tasks

- [x] Install Vitest for unit tests
- [x] Unit tests: validators, pricing logic, utility helpers
- [ ] Firestore security rules tests
- [x] API route tests
- [x] Install Playwright for E2E
- [ ] E2E: signup → book → pay flow
- [ ] E2E: technician application + admin approval
- [ ] E2E: disclaimer modal enforcement
- [x] E2E: auth redirect for protected routes
- [ ] Manual QA on mobile (375px) and desktop

## Notes

- Critical test: disclaimer must block booking flow if not accepted
- Critical test: payment flow with MercadoPago sandbox
- Added `vitest.config.ts` with `@` alias resolution and env setup for unit tests
- Current unit coverage includes shared validators plus `calculatePricing`, `formatPrice`, `formatWhatsAppLink`, and `cn`
- Booking disclaimer enforcement and role-based status transitions now live in `src/lib/booking-rules.ts` with direct unit coverage
- `/api/bookings` and `/api/bookings/[id]` now have mocked handler tests covering auth, validation, disclaimer enforcement, MercadoPago fallback, and role-based transitions
- `/api/technicians/me` now has mocked handler tests for auth, role checks, validation, and successful profile updates
- `/api/users/me` and `/api/reviews` now have mocked handler tests covering auth, validation, data ownership, duplicate protection, and successful mutations
- `@playwright/test` is installed with a production-style `playwright.config.ts` and Chromium smoke coverage for `/dashboard` auth redirect plus public booking/search/technician pages
