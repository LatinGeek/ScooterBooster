# Tracker — Phase 17: Testing & QA

> Status: ⬜ NOT STARTED
> Last updated: 2026-04-17

## Tasks

- [ ] Install Vitest for unit tests
- [ ] Unit tests: validators, pricing logic, utility helpers
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
