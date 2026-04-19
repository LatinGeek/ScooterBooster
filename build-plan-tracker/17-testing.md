# Tracker - Phase 17: Testing & QA

> Status: PARTIAL - Vitest, Firestore rules, and Playwright are green in dev mode; the remaining gap is full hosted payment confirmation back into ScooterBooster
> Last updated: 2026-04-19

## Tasks

- [x] Install Vitest for unit tests
- [x] Unit tests: validators, pricing logic, utility helpers
- [x] Firestore security rules tests
- [x] API route tests
- [x] Install Playwright for E2E
- [x] E2E: book -> pay handoff flow
- [ ] E2E: signup -> book -> pay flow
- [ ] E2E: technician application + admin approval
- [x] E2E: disclaimer modal enforcement
- [x] E2E: auth redirect for protected routes
- [x] Manual/visual QA on mobile public flows (375px + landscape)
- [ ] Manual QA on desktop-authenticated dashboards and payment completion return path

## Notes

- `npm test` is green with handler coverage across auth, bookings, reviews, search, technicians, users, payments, and admin routes.
- `npm run test:rules` is wired through the Firestore emulator and has been verified with the Java-backed local setup.
- `npm run test:e2e` is green in local production mode after stabilizing loopback auth cookies, trusted-origin checks, and rate-limit exceptions for local E2E traffic.
- Playwright coverage now includes auth redirects, disclaimer enforcement, public responsive checks, authenticated dashboards, admin technician approval, technician booking management, and MercadoPago checkout handoff.
- The remaining payment gap is true confirmation back into ScooterBooster after the hosted MercadoPago flow, which still needs a publicly reachable callback/webhook target.
