# Phase 22 — Launch Checklist & Go-Live

> **Goal:** Final gate before public launch. If anything here is red, we don't launch.

## 22.1 — Product Gate

- [ ] Every phase file (00–21) has all boxes checked
- [ ] Landing page copy final and proofread (Spanish UY)
- [ ] Hero image + OG image final
- [ ] At least 3 approved technicians live with complete profiles, photos, and availability
- [ ] At least 10 scooter models with images and complete specs
- [ ] All 4 services live with copy reviewed
- [ ] Speed-limit disclaimer tested end-to-end on multiple devices

## 22.2 — Legal Gate

- [ ] Terms of Service reviewed by Uruguayan counsel (or signed-off template)
- [ ] Privacy Policy compliant with Ley 18.331
- [ ] Cookie Policy published
- [ ] Data-export endpoint working
- [ ] Audit log persisting

## 22.3 — Technical Gate

- [ ] CI green on `main`
- [ ] `npm run build` zero warnings
- [ ] `npx tsc --noEmit` zero errors
- [ ] `npm audit --omit=dev` zero high/critical
- [ ] Lighthouse mobile ≥ 90 Perf, ≥ 95 A11y/SEO/BP on 5 key pages
- [ ] axe clean
- [ ] Sentry quiet (no unresolved errors from last 48h of preview testing)

## 22.4 — Security Gate

- [ ] Security headers grade A on [securityheaders.com](https://securityheaders.com)
- [ ] Rate limits active
- [ ] Firebase rules tested against unauthorized access scenarios
- [ ] MP webhook signature verification tested with invalid signatures
- [ ] No secrets in repo (`gitleaks` clean)

## 22.5 — Ops Gate

- [ ] Uptime monitoring active
- [ ] Sentry alerts wired to team channel
- [ ] Firestore daily backups running
- [ ] On-call contact documented
- [ ] Incident response runbook drafted

## 22.6 — Marketing Gate

- [ ] Social accounts created (Instagram, WhatsApp Business)
- [ ] Launch announcement drafted (Spanish)
- [ ] First 10 beta technicians lined up
- [ ] Press-kit page `/prensa` published

## 22.7 — Go-Live Day

- [ ] Announce to beta users
- [ ] Monitor Sentry + Vercel + GA for first 24h
- [ ] Be ready to hotfix and redeploy within 15 minutes
- [ ] Log lessons learned to `knowledge-base/learnings.md`
- [ ] Celebrate 🚀 (non-emoji celebration optional per design system)

## 22.8 — Post-Launch (Week 1)

- [ ] Daily standup: Sentry issues, user feedback, conversion funnel
- [ ] Ship at least one UX improvement based on real usage
- [ ] Collect first 10 reviews from real bookings
- [ ] Validate that rating aggregation works in prod

## Definition of MVP Complete

When every box above is checked, **MVP is 100% complete**. Any new scope after this point goes into `build-plan/vNext/` — not into MVP.

At this point, update `knowledge-base/learnings.md` with a final retro entry titled `## MVP Launch Retrospective — <date>`.
