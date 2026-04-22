# Tracker - Phase 17: Testing & QA

> Status: PARTIAL - Vitest, Firestore rules, and Playwright are green in dev mode; the main remaining gap is a true externally confirmed payment loop plus final cross-environment manual QA
> Last updated: 2026-04-22

## Tasks

- [x] Install Vitest for unit tests
- [x] Unit tests: validators, pricing logic, utility helpers
- [x] Firestore security rules tests
- [x] API route tests
- [x] Install Playwright for E2E
- [x] E2E: book -> pay handoff flow
- [x] E2E: signup -> book -> pay flow
- [x] E2E: technician application + admin approval
- [x] E2E: disclaimer modal enforcement
- [x] E2E: auth redirect for protected routes
- [x] Manual/visual QA on mobile public flows (375px + landscape)
- [x] Manual QA on desktop-authenticated dashboard/admin navigation
- [ ] Payment completion return path after a true hosted approval

## Notes

- `npm test` is green with handler coverage across auth, bookings, reviews, search, technicians, users, payments, and admin routes.
- `npm run test:rules` is wired through the Firestore emulator and has been verified with the Java-backed local setup.
- `npm run test:e2e` is green in local production mode after stabilizing loopback auth cookies, trusted-origin checks, and rate-limit exceptions for local E2E traffic.
- Playwright coverage now includes auth redirects, disclaimer enforcement, public responsive checks, authenticated dashboards, admin technician approval, technician booking management, and MercadoPago checkout handoff.
- Desktop-authenticated smoke coverage now also checks the authorized navbar state plus key user/admin/technician destinations: notifications, admin users, admin bookings, admin audit, observability, and technician profile management.
- A fresh signed-in-user Playwright spec now covers the onboarding completion path before the booking wizard, so the core `signup -> book -> pay handoff` flow is also exercised in dev mode.
- Playwright now also covers technician profile editing, grouped notification UX, user dashboard rendering with paid bookings, clearer booking-detail payment guidance, and technician earnings with completed bookings present.
- The booking-payment handoff assertion is now deterministic in Playwright by capturing the generated checkout URL in an E2E-only branch instead of relying on flaky cross-site navigation during the test run.
- The remaining payment gap is true confirmation back into ScooterBooster after the hosted MercadoPago flow, which still needs a publicly reachable callback/webhook target.
