# Tracker — Phase 19: Security Hardening

> Status: ⬜ NOT STARTED
> Last updated: 2026-04-17

## Tasks

- [ ] HTTP security headers (HSTS, nosniff, X-Frame-Options, CSP) via next.config
- [ ] Rate limiting on booking + payment endpoints (Upstash)
- [ ] Input sanitization (Zod + HTML sanitize)
- [ ] HttpOnly/Secure cookie flags for auth
- [ ] Final Firestore rules review
- [ ] Dependency audit (`npm audit`)
- [ ] CSRF protection for mutations
- [ ] GDPR-style data export + hard-delete endpoints (Ley 18.331 compliance)

## Notes

- Upstash Redis for rate limiting (Vercel-compatible)
- All API mutations must verify auth token on server side
