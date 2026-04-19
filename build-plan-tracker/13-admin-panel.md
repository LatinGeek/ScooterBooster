# Tracker - Phase 13: Admin Panel

> Status: PARTIAL - moderation, settings, roles, and user visibility are live; catalog CRUD and finance tooling still remain
> Last updated: 2026-04-19

## Tasks

- [x] Admin dashboard overview
- [x] User listing
- [x] Role assignment endpoint
- [x] Technician moderation queue
- [x] Approve/reject technicians from the admin UI
- [x] Technician approval updates Firebase custom claims
- [x] Basic settings page
- [ ] Catalog CRUD for brands, models, and services
- [ ] Review moderation tools
- [ ] Refund / payment operations UI
- [ ] Audit log viewer UI

## Notes

- The admin technician flow is now end-to-end in dev: pending application -> admin moderation UI -> claim update -> public listing eligibility.
- `auditLog` entries are created for technician application submissions, but we still do not expose a dedicated admin viewer for those entries.
