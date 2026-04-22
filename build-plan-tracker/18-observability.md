# Tracker - Phase 18: Observability

> Status: PARTIAL - Vercel Analytics/Speed Insights, Sentry SDK wiring, `/api/health`, local GA4 event plumbing, and an in-app admin observability panel are now in place
> Last updated: 2026-04-22

## Tasks

- [ ] Sentry error tracking + source maps
- [x] Google Analytics 4 with custom events (signup, booking, payment, review, approval) wired in-app behind cookie consent
- [x] Vercel Analytics + Speed Insights
- [x] Internal observability dashboard/checklist in admin
- [ ] Structured logging with pino (from Phase 01) -> Vercel Log Drains
- [ ] Uptime monitoring

## Notes

- Never log PII or credentials
- Custom GA4 events documented in `build-plan/18-observability.md`
- `src/app/layout.tsx` now mounts `@vercel/analytics/next` and `@vercel/speed-insights/next`, but only when `process.env.VERCEL === "1"` so local production builds and Playwright do not hit missing `/_vercel/*` endpoints.
- `src/app/api/health/route.ts` now checks Firestore reachability via `config/global` and returns `{ ok: true, timestamp, route }`.
- `src/lib/api-response.ts` now logs route, method, status, and duration for request-based API handlers through the existing pino logger.
- `@sentry/nextjs` is installed and wired through `src/instrumentation.ts`, `src/instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/app/global-error.tsx`, and `next.config.ts`.
- `src/app/api/_test/sentry/route.ts` can emit a dev-only verification event, but source-map upload verification still depends on the provided `SENTRY_AUTH_TOKEN` being valid in the target build environment.
- `src/components/analytics-provider.tsx` now loads GA4 only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` exists and the user accepts analytics cookies. Custom events currently cover signup completion, booking start, payment initiation, payment success/failure return states, review submission, technician application, and technician approval.
- `src/app/admin/observability/page.tsx` now gives admins a live env/status checklist for health checks, Sentry readiness, analytics wiring, reminder prerequisites, and quick links to `/api/health`, `/api/_test/sentry` (dev only), and audit history.
