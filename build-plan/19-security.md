# Phase 19 — Security Hardening

> **Goal:** OWASP Top 10 clean, secrets safe, rate-limited, headers locked down.

## 19.1 — HTTP Security Headers

- [ ] Configure `next.config.ts` headers:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
  - `Content-Security-Policy` (nonce-based, allowlist MP + Firebase + Sentry + GA)

## 19.2 — Rate Limiting

- [ ] Install `@upstash/ratelimit` + `@upstash/redis`
- [ ] Create `src/lib/ratelimit.ts` with per-route limits:
  - `/api/auth/*` — 10 / min / IP
  - `/api/bookings` — 30 / min / user
  - `/api/payments/*` — 10 / min / user
  - `/api/payments/webhook` — 100 / sec (trust MP IPs only)
  - `/api/reviews` — 10 / day / user

## 19.3 — Input Validation

- [ ] Every API route parses body with Zod
- [ ] Reject early with 400 and Spanish error message
- [ ] Sanitize HTML from user content (reviews, bios) with `isomorphic-dompurify`

## 19.4 — Auth Hardening

- [ ] Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax`
- [ ] ID token refresh on session expiry
- [ ] Revoke Firebase sessions on suspicious activity (admin action)

## 19.5 — Firestore Rules Review

- [ ] Re-read every rule from Phase 04
- [ ] Simulate unauthorized access with the Firebase Rules Playground
- [ ] Add deny-by-default at the top

## 19.6 — Secrets Rotation Policy

- [ ] Document rotation cadence for:
  - Firebase admin private key: every 90 days
  - MercadoPago access token: on any team-member change
  - Vercel tokens: every 90 days
  - Sentry DSN: public, no rotation needed
- [ ] Calendar reminders

## 19.7 — Dependency Audit

- [ ] `npm audit --omit=dev` must report zero high/critical
- [ ] Enable Dependabot on GitHub
- [ ] Add weekly `npm audit` check in CI

## 19.8 — CSRF

- [ ] State-changing API routes check `Origin` header matches `NEXT_PUBLIC_APP_URL`
- [ ] SameSite cookies provide baseline protection
- [ ] Document in `knowledge-base/integrations/security.md`

## 19.9 — Privacy

- [ ] Implement data-export endpoint for user (GDPR-style, even if Uruguay law doesn't strictly require)
- [ ] Implement hard-delete path when users request (30-day grace period after soft-delete)

## Exit Criteria

- [ ] Security headers verified via [securityheaders.com](https://securityheaders.com) — grade A
- [ ] Rate limiting working (manually tested)
- [ ] `npm audit` clean
- [ ] No secrets in repo
- [ ] Dependabot on
