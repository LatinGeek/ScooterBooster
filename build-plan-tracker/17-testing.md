# Tracker - Phase 17: Testing & QA

> Status: PARTIAL - Vitest, Firestore rules, and Playwright are green in dev mode; the main remaining gap is a true externally confirmed payment loop and a few broader manual QA passes
> Last updated: 2026-04-19

## Tasks

- [x] Install Vitest for unit tests
- [x] Unit tests: validators, pricing logic, utility helpers
- [x] Firestore security rules tests
- [x] API route tests
- [x] Install Playwright for E2E
- [x] E2E: book -> pay handoff flow
- [ ] E2E: signup -> book -> pay flow
- [x] E2E: technician application + admin approval
- [x] E2E: disclaimer modal enforcement
- [x] E2E: auth redirect for protected routes
- [x] Manual/visual QA on mobile public flows (375px + landscape)
- [ ] Manual QA on desktop-authenticated dashboards and payment completion return path

## Notes

- `npm test` is green with handler coverage across auth, bookings, reviews, search, technicians, users, payments, and admin routes.
- `npm run test:rules` is wired through the Firestore emulator and has been verified with the Java-backed local setup.
- `npm run test:e2e` is green in local production mode after stabilizing loopback auth cookies, trusted-origin checks, and rate-limit exceptions for local E2E traffic.
- Playwright coverage now includes auth redirects, disclaimer enforcement, public responsive checks, authenticated dashboards, admin technician approval, technician booking management, and MercadoPago checkout handoff.
- Playwright now also covers technician profile editing, and the local suite runs with a single worker in dev mode to avoid shared-auth flakiness across concurrent browser workers.
- The booking-payment handoff assertion is now deterministic in Playwright by capturing the generated checkout URL in an E2E-only branch instead of relying on flaky cross-site navigation during the test run.
- The remaining payment gap is true confirmation back into ScooterBooster after the hosted MercadoPago flow, which still needs a publicly reachable callback/webhook target.
