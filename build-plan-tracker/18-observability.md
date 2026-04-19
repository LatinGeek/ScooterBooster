# Tracker - Phase 18: Observability

> Status: PARTIAL - Vercel Analytics/Speed Insights are wired and `/api/health` is live with request logging
> Last updated: 2026-04-19

## Tasks

- [ ] Sentry error tracking + source maps
- [ ] Google Analytics 4 with custom events (signup, booking, payment, review, approval)
- [x] Vercel Analytics + Speed Insights
- [ ] Structured logging with pino (from Phase 01) -> Vercel Log Drains
- [ ] Uptime monitoring

## Notes

- Never log PII or credentials
- Custom GA4 events documented in `build-plan/18-observability.md`
- `src/app/layout.tsx` now mounts `@vercel/analytics/next` and `@vercel/speed-insights/next`, but only when `process.env.VERCEL === "1"` so local production builds and Playwright do not hit missing `/_vercel/*` endpoints.
- `src/app/api/health/route.ts` now checks Firestore reachability via `config/global` and returns `{ ok: true, timestamp, route }`.
- `src/lib/api-response.ts` now logs route, method, status, and duration for request-based API handlers through the existing pino logger.
