# Tracker â€” Phase 17: Testing & QA

> Status: PARTIAL - Vitest now covers most auth/admin/payment/review/booking handlers plus Playwright smoke checks
> Last updated: 2026-04-19

## Tasks

- [x] Install Vitest for unit tests
- [x] Unit tests: validators, pricing logic, utility helpers
- [x] Firestore security rules tests
- [x] API route tests
- [x] Install Playwright for E2E
- [ ] E2E: signup â†’ book â†’ pay flow
- [ ] E2E: technician application + admin approval
- [x] E2E: disclaimer modal enforcement
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
- `/api/admin/settings`, `/api/admin/technicians/[id]`, and `/api/auth/me` now have mocked handler tests; admin validation messages were also localized to Spanish
- `/api/auth/session`, `/api/auth/signout`, `/api/admin/set-role`, and `/api/payments/initiate` now have mocked handler tests covering cookie/session behavior, role assignment, and payment-link recreation
- `/api/payments/webhook`, `/api/payments`, `/api/search`, `/api/technicians`, and `/api/reviews/[id]` now have handler tests covering signature validation, idempotency, grouped search filters, placeholder application responses, technician replies, and payment route guidance
- `@playwright/test` is installed with a production-style `playwright.config.ts` and Chromium smoke coverage for `/dashboard` auth redirect plus public booking/search/technician pages
- `tests/e2e/booking-disclaimer.spec.ts` now confirms that speed-limit bookings cannot reach the confirmation step until the legal disclaimer modal is accepted
- `tests/e2e/responsive-public-routes.spec.ts` now covers 375px mobile and landscape-mobile rendering for the booking wizard, technician listing, and search results
- `tests/e2e/authenticated-dashboards.spec.ts` plus `tests/e2e/support/auth.ts` now create real session cookies from Firebase custom tokens so user, technician, and admin dashboards can be exercised in-browser without Google popup automation
- `tests/e2e/booking-flow.spec.ts` now covers authenticated booking creation end-to-end in the browser; Playwright boots the app via `npm run start:e2e` so the test-only auth helper is compiled in and MercadoPago is disabled for deterministic in-app completion
- `firestore.rules`, `tests/firestore.rules.test.ts`, and `npm run test:rules` are now wired and executable when Java is available for the Firestore emulator


