# Tracker — Phase 13: Admin Panel

> Status: 🔶 PARTIAL — core done, catalog management + moderation deferred
> Last updated: 2026-04-18

## Tasks

- [x] Access control — proxy.ts enforces admin role for /admin/*
- [x] Platform KPIs (users, technicians, bookings, GMV, platform revenue, reviews) — overview page
- [x] Technician approval queue — Pending/Approved/Rejected tabs with approve/reject actions
- [x] User management — list with role badges (read-only for now, 100-user limit)
- [x] Global settings — service fee percentage (Firestore config/global)
- [x] PATCH /api/admin/technicians/[id] — approve/reject endpoint
- [x] GET/PATCH /api/admin/settings
- [ ] Scooter catalog management (add/edit brands/models) — deferred to Phase 21 (seed covers MVP)
- [ ] Service catalog management — deferred to Phase 21
- [ ] Image upload via Firebase Storage — deferred
- [ ] Force-cancel bookings + trigger MP refunds — deferred to Phase 21
- [ ] Review moderation (flag/hide) — deferred
- [ ] Audit log viewer — deferred
- [ ] Grant/revoke admin role via UI — deferred (use Firebase Console for now)

## Notes

- Admin role is set via Firebase custom claims — never via client. Use Firebase Console to promote first admin.
- Service fee % in Firestore config/global takes precedence over SERVICE_FEE_PERCENTAGE env var for new bookings.
- NOTE: mercadopago.ts still reads from env var (not Firestore config) — Phase 21 task to wire Firestore config into pricing calculation.
