# Phase 17 — Testing & QA

> **Goal:** Automated test coverage for critical paths + manual QA sign-off.

## 17.1 — Unit Tests (Vitest)

- [ ] Install: `npm i -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom`
- [ ] Configure `vitest.config.ts`
- [ ] Cover:
  - Zod validators (100%)
  - Pricing calculator (100%)
  - `formatPrice`, `formatWhatsAppLink`, `cn`
  - Booking state-transition helper
  - Disclaimer-required detection

## 17.2 — Firestore Rules Tests

- [ ] Already set up in Phase 04
- [ ] Ensure they run in CI

## 17.3 — API Route Tests

- [ ] Test every API route with mocked Firebase Admin
- [ ] Include auth / authorization / validation failure cases
- [ ] MP webhook: signature verification + idempotency

## 17.4 — E2E Tests (Playwright)

- [ ] Install: `npm i -D @playwright/test && npx playwright install`
- [ ] Scenarios:
  1. Signup → onboarding → dashboard
  2. Browse scooter → view services → select technician → book → pay (MP sandbox) → see confirmed booking
  3. Technician login → approve pending booking → mark complete → user leaves review
  4. Admin → approve technician → verify visible in listing
  5. Speed-limit disclaimer cannot be bypassed
  6. Logged-out user hitting `/dashboard` is redirected to `/login`

## 17.5 — Manual QA Checklist

Run on prod Vercel preview before launch:

- [ ] All pages load on: iPhone 13, Pixel 7, iPad, 13" laptop, 27" monitor
- [ ] Landscape mobile works
- [ ] Slow 3G throttle: all pages load < 5s
- [ ] Keyboard-only navigation possible through every flow
- [ ] Screen reader (VoiceOver / NVDA) announces page changes
- [ ] Forms show Spanish validation errors
- [ ] All emojis replaced by Lucide icons (none missed)

## 17.6 — Accessibility Audit

- [ ] Run `axe` on every page
- [ ] Fix all violations
- [ ] Lighthouse Accessibility ≥ 95 on every page

## Exit Criteria

- [ ] Unit test coverage ≥ 70% for `src/lib/`
- [ ] All E2E scenarios pass on CI
- [ ] Manual QA checklist complete
- [ ] Zero axe violations
