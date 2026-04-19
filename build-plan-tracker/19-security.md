# Tracker - Phase 19: Security Hardening

> Status: COMPLETE
> Last updated: 2026-04-19

## Tasks

- [x] HTTP security headers (HSTS, nosniff, X-Frame-Options, CSP) via next.config
- [x] Rate limiting on booking + payment endpoints (Upstash)
- [x] Input sanitization (Zod + HTML sanitize)
- [x] HttpOnly/Secure cookie flags for auth
- [x] Final Firestore rules review
- [x] Dependency audit (`npm audit`)
- [x] CSRF protection for mutations
- [x] GDPR-style data export + hard-delete endpoints (Ley 18.331 compliance)

## Notes

- `next.config.ts` now emits all 8 security headers including a full CSP.
  CSP allows: self, Firebase (Firestore/Auth WS), MercadoPago API + checkout
  frames, Google Sign-In frames, Sentry ingest, Google Analytics/GTM.
  `object-src 'none'` + `frame-ancestors 'none'` provide XSS/clickjacking baseline.
  `upgrade-insecure-requests` forces HTTPS sub-resources.
  Note: `unsafe-inline` retained for scripts/styles (Next.js hydration + Tailwind);
  nonce-based CSP is a post-launch improvement.

- Rate limiting: Upstash when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`
  set, in-memory fallback for local dev. Limits: auth 10/min/IP, bookings 30/min/user,
  payments 10/min/user, reviews 10/day/user.

- CSRF: `assertTrustedOrigin()` in `src/lib/security.ts` applied to all mutation routes.
  Localhost allowed in non-prod for Playwright.

- Hard-delete: `DELETE /api/users/me` now sets `deletedAt` + `scheduledDeletionAt`
  (30 days from now) and immediately clears `phone` / `whatsappConsent`.
  `POST /api/admin/users/purge-deleted` does the actual hard-delete: removes reviews,
  anonymizes bookings, deletes technician profile, deletes Firestore user doc,
  deletes Firebase Auth account. Cron: daily 03:00 UTC via `vercel.json`.
  Cron authorized by `CRON_SECRET` env var Bearer token.

- Firestore rules: deny-by-default at bottom, bookings client-read-only,
  reviews require completed booking, config/payment/audit docs fully locked.
  Users rule now blocks owner reads after soft-delete and prevents direct
  role/deletedAt edits from client (must go through API).

- `npm audit --omit=dev`: 0 vulnerabilities.
- Dependabot: `.github/dependabot.yml` enabled for npm + GitHub Actions.
- Weekly audit: `.github/workflows/security-audit.yml`.
