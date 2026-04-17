# Phase 21 — Deployment (Vercel + Firebase Prod)

> **Goal:** Production environment live at `scooterbooster.uy`.

## 21.1 — Firebase Production Setup

- [ ] Switch to prod alias: `firebase use prod`
- [ ] Deploy rules: `firebase deploy --only firestore:rules,storage`
- [ ] Deploy indexes: `firebase deploy --only firestore:indexes`
- [ ] Seed prod with brands, models, services (not technicians — those must apply): `npx tsx scripts/seed.ts --project=prod --no-technicians`
- [ ] Grant your Google account admin role via MCP or Admin SDK script
- [ ] Double-check authorized domains include `scooterbooster.uy`

## 21.2 — Vercel Production Env Vars

- [ ] Set all env vars per Phase 01 under the **Production** scope
- [ ] Use **prod** Firebase + **prod** MercadoPago credentials
- [ ] Verify no dev credentials leak into prod
- [ ] Set `NEXT_PUBLIC_APP_URL=https://scooterbooster.uy`
- [ ] Set `SERVICE_FEE_PERCENTAGE=10` (or whatever final value)

## 21.3 — Domain Configuration

- [ ] Buy `scooterbooster.uy` if not already owned (NIC.UY registrar)
- [ ] In Vercel project: add `scooterbooster.uy` + `www.scooterbooster.uy`
- [ ] Configure DNS at registrar:
  - `A` record `@` → Vercel IP
  - `CNAME` record `www` → `cname.vercel-dns.com`
- [ ] Wait for propagation; verify SSL issued (Let's Encrypt via Vercel)
- [ ] Redirect `www` → apex

## 21.4 — MercadoPago Production

- [ ] Swap `MERCADOPAGO_ACCESS_TOKEN` and `MERCADOPAGO_PUBLIC_KEY` to production values
- [ ] Register the webhook URL in MP dashboard: `https://scooterbooster.uy/api/payments/webhook`
- [ ] Whitelist MP IPs on any rate-limit overrides
- [ ] Run a real low-value transaction (5 UYU) end-to-end and refund it

## 21.5 — Deploy

- [ ] Merge `main` — Vercel auto-deploys production
- [ ] Monitor deploy logs in Vercel
- [ ] Verify `/api/health` returns 200 on prod
- [ ] Sentry source maps uploaded

## 21.6 — Post-Deploy Smoke Tests

- [ ] Home page loads
- [ ] Sign in with Google works
- [ ] Browse scooters, services, technicians
- [ ] Start a booking (create a test technician via admin panel first)
- [ ] Complete payment with real low-value transaction
- [ ] Webhook fires and updates status
- [ ] Review flow works
- [ ] Refund the test transaction

## 21.7 — Rollback Plan

- [ ] Document rollback via Vercel: promote previous deployment
- [ ] Firestore: no rollback — keep regular backups via scheduled `gcloud firestore export`
- [ ] Set up daily export via Cloud Scheduler → GCS bucket

## Exit Criteria

- [ ] Live at `https://scooterbooster.uy` with SSL
- [ ] All prod smoke tests green
- [ ] Daily Firestore backup scheduled
- [ ] Rollback procedure documented
