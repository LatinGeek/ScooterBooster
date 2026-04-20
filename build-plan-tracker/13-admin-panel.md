# Tracker - Phase 13: Admin Panel

> Status: PARTIAL - moderation, settings, roles, users, and audit visibility are live; catalog CRUD and finance tooling still remain
> Last updated: 2026-04-20

## Tasks

- [x] Admin dashboard overview
- [x] User listing
- [x] Role assignment endpoint
- [x] Technician moderation queue
- [x] Approve/reject technicians from the admin UI
- [x] Technician approval updates Firebase custom claims
- [x] Audit log viewer UI
- [x] Basic settings page
- [ ] Catalog CRUD for brands, models, and services
- [ ] Review moderation tools
- [ ] Refund / payment operations UI

## Notes

- The admin technician flow is now end-to-end in dev: pending application -> admin moderation UI -> claim update -> public listing eligibility.
- `/admin/audit` now exposes a read-only audit stream with filters for action, actor UID, and target type so admins can inspect technician applications, booking lifecycle writes, reminder runs, and payment webhooks without opening Firebase.
- Admin moderation now also records explicit `technician_approved` / `technician_rejected` audit entries and sends follow-up emails when Resend is configured.
