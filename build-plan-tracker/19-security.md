# Tracker - Phase 19: Security Hardening

> Status: PARTIAL - CSRF origin checks, dependency-audit automation, core mutation rate limiting, HTML sanitization, and user data export are now in place
> Last updated: 2026-04-19

## Tasks

- [ ] HTTP security headers (HSTS, nosniff, X-Frame-Options, CSP) via next.config
- [ ] Rate limiting on booking + payment endpoints (Upstash)
- [x] Input sanitization (Zod + HTML sanitize)
- [x] HttpOnly/Secure cookie flags for auth
- [ ] Final Firestore rules review
- [x] Dependency audit (`npm audit`)
- [x] CSRF protection for mutations
- [ ] GDPR-style data export + hard-delete endpoints (Ley 18.331 compliance)

## Notes

- Upstash Redis for rate limiting (Vercel-compatible)
- All API mutations must verify auth token on server side
- `src/lib/security.ts` now rejects mutation requests whose `Origin` header does not match the trusted app origin. In non-production, localhost origins are also allowed so local browser development and Playwright still work.
- Mutation routes protected in this slice: auth session/signout, bookings, booking status updates, payments initiation, reviews, technician profile edits, user profile/account deletion, and admin mutations.
- `knowledge-base/integrations/security.md` documents the trusted-origin rule and why server-to-server webhooks are excluded.
- `npm audit --omit=dev` is currently clean (0 vulnerabilities).
- Dependabot is configured in `.github/dependabot.yml` for npm and GitHub Actions updates, and `.github/workflows/security-audit.yml` runs the production dependency audit on a weekly schedule plus manual dispatch.
- `src/lib/ratelimit.ts` now enforces these limits with Upstash when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present, and falls back to an in-memory limiter for local development:
  - auth session/signout: 10 requests per minute per IP
  - booking creation: 30 requests per minute per user
  - payment initiation: 10 requests per minute per user
  - review creation: 10 requests per day per user
- MercadoPago webhook trust/IP allowlisting is still pending; the webhook keeps signature verification but is not yet behind the new rate-limit helper.
- `src/lib/sanitize.ts` now runs `isomorphic-dompurify` on review comments, technician replies, and technician bios before validation/persistence so stored user content stays plain-text safe.
- `GET /api/users/me/export` now returns a user-owned export bundle with the profile doc, bookings, reviews, and linked technician profile so the privacy/export path exists before the eventual hard-delete workflow.
