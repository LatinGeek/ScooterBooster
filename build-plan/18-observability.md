# Phase 18 — Observability (Logging, Analytics, Errors)

> **Goal:** Know what's happening in prod. Catch errors before users report them.

## 18.1 — Error Tracking (Sentry)

- [ ] Create Sentry project `scooterbooster`
- [ ] Install: `npm i @sentry/nextjs`
- [ ] Run Sentry wizard: `npx @sentry/wizard@latest -i nextjs`
- [ ] Verify client, server, and edge configs
- [ ] Add `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` env vars
- [ ] Upload source maps on Vercel build
- [ ] Add test error route `/api/_test/sentry` (dev-only) to verify
- [ ] Configure alerts: Slack / email on new issue

## 18.2 — Analytics

- [ ] Google Analytics 4 (or Plausible for privacy)
- [ ] Fire events:
  - `signup_completed`
  - `booking_started`
  - `booking_confirmed`
  - `payment_initiated`
  - `payment_succeeded`
  - `payment_failed`
  - `review_submitted`
  - `technician_applied`
  - `technician_approved`
- [ ] Conversion funnels defined in GA

## 18.3 — Vercel Analytics & Speed Insights

- [ ] Enable Vercel Web Analytics
- [ ] Enable Speed Insights
- [ ] Add `<Analytics />` and `<SpeedInsights />` to layout

## 18.4 — Structured Logging

- [ ] All API routes log: `{ route, method, userId?, duration, status }`
- [ ] Pipe to Vercel Log Drains (Axiom, Datadog, or Logtail)
- [ ] Retain 30 days

## 18.5 — Uptime Monitoring

- [ ] Set up Better Uptime / UptimeRobot on:
  - `https://scooterbooster.uy` (200 expected)
  - `https://scooterbooster.uy/api/health` (returns `{ ok: true }`)
- [ ] Create `/api/health` route that pings Firestore

## 18.6 — Dashboards

- [ ] Build a Notion / Linear doc linking:
  - Sentry issues
  - GA dashboard
  - Vercel Analytics
  - Uptime status
- [ ] Share with team

## Exit Criteria

- [ ] Sentry catching prod errors with source maps
- [ ] GA events firing and visible
- [ ] Uptime checks green
- [ ] Health endpoint live
