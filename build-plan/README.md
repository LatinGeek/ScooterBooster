# ScooterBooster — Build Plan (0% → 100% MVP)

> **Owner:** Alan (lead dev agent)
> **Goal:** Ship a polished, production-ready MVP of scooterbooster.uy with every feature listed in `ALAN.md` implemented, tested, and deployed.
> **Format:** Every file is a phase. Every phase is a checklist of actionable TODOs. Tick them off (`- [x]`) as you go. Don't skip ahead.

## How to Use This Plan

1. Start at Phase 00 and work sequentially. Phases build on each other.
2. Each phase ends with an **Exit Criteria** section. Don't advance until all boxes are checked.
3. When you hit something not in the plan, **add it to the relevant phase** and keep going. Also log it to `knowledge-base/learnings.md`.
4. At the end of every phase, run `npm run build && npm run lint` and commit with a `feat(phase-XX): …` message.
5. If a step becomes obsolete, mark it `- [x] ~~(superseded)~~` with a link to the replacement step — don't delete it.

## Phase Index

| # | Phase | File |
|---|-------|------|
| 00 | MCP Setup (Firebase + Vercel) — **Do this first** | [00-mcp-setup.md](00-mcp-setup.md) |
| 01 | Foundations & Environment | [01-foundations.md](01-foundations.md) |
| 02 | Design System Implementation | [02-design-system.md](02-design-system.md) |
| 03 | Authentication & User Profiles | [03-auth.md](03-auth.md) |
| 04 | Firestore Schema, Rules & Seed Data | [04-firestore.md](04-firestore.md) |
| 05 | Scooter Catalog (Brands & Models) | [05-scooter-catalog.md](05-scooter-catalog.md) |
| 06 | Service Catalog + Legal Disclaimer | [06-services.md](06-services.md) |
| 07 | Technicians (Onboarding, Profiles, Approval) | [07-technicians.md](07-technicians.md) |
| 08 | Booking Flow | [08-booking.md](08-booking.md) |
| 09 | Payments (MercadoPago) | [09-payments.md](09-payments.md) |
| 10 | Reviews & Ratings | [10-reviews.md](10-reviews.md) |
| 11 | User Dashboard | [11-user-dashboard.md](11-user-dashboard.md) |
| 12 | Technician Dashboard | [12-technician-dashboard.md](12-technician-dashboard.md) |
| 13 | Admin Panel | [13-admin-panel.md](13-admin-panel.md) |
| 14 | Notifications & WhatsApp Integration | [14-notifications.md](14-notifications.md) |
| 15 | Search, Filters & Discovery | [15-search.md](15-search.md) |
| 16 | SEO, Metadata & Legal Pages | [16-seo-legal.md](16-seo-legal.md) |
| 17 | Testing & QA | [17-testing.md](17-testing.md) |
| 18 | Observability (Logging, Analytics, Errors) | [18-observability.md](18-observability.md) |
| 19 | Security Hardening | [19-security.md](19-security.md) |
| 20 | Performance & Polish | [20-performance.md](20-performance.md) |
| 21 | Deployment (Vercel + Firebase Prod) | [21-deployment.md](21-deployment.md) |
| 22 | Launch Checklist & Go-Live | [22-launch.md](22-launch.md) |

## Definition of Done (MVP)

The MVP is 100% complete when **every box** in every phase file is checked AND:

- [ ] `npm run build` passes with zero warnings
- [ ] `npm run lint` passes with zero errors
- [ ] All critical flows work end-to-end in production (signup → book → pay → review)
- [ ] Firebase security rules deployed and tested
- [ ] Domain `scooterbooster.uy` live on Vercel with SSL
- [ ] Admin can approve technicians via the admin panel
- [ ] At least 3 seeded technicians and 10 scooter models in prod Firestore
- [ ] Speed-limit disclaimer modal is enforced before booking any speed-modification service
- [ ] All UI text is in Spanish (es-UY)
- [ ] Lighthouse score: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95 on mobile
- [ ] Error tracking (Sentry) capturing and alerting
- [ ] Google Analytics + custom events tracking conversions
- [ ] Legal pages published: Terms, Privacy, Cookie policy (all in Spanish)
- [ ] Launch checklist (Phase 22) fully green
