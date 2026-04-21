# Tracker - Phase 13: Admin Panel

> Status: PARTIAL - bookings, refunds, moderation, settings, roles, users, audit visibility, catalog CRUD, and analytics are live; the remaining gap is mainly deeper admin override tooling
> Last updated: 2026-04-21

## Tasks

- [x] Admin dashboard overview
- [x] User listing
- [x] Role assignment endpoint
- [x] Technician moderation queue
- [x] Approve/reject technicians from the admin UI
- [x] Technician approval updates Firebase custom claims
- [x] Audit log viewer UI
- [x] Basic settings page
- [x] Catalog CRUD for brands, models, and services
- [x] Review moderation tools
- [x] Bookings operations UI (`/admin/bookings`)
- [x] Admin refund / payment operations UI
- [x] User search, role controls, and suspend/restore workflow in `/admin/users`
- [x] KPI charts for bookings and GMV over the last 30 days
- [ ] Technician profile override editor from the admin side

## Notes

- The admin technician flow is now end-to-end in dev: pending application -> admin moderation UI -> claim update -> public listing eligibility.
- `/admin/audit` exposes a read-only audit stream with filters for action, actor UID, and target type so admins can inspect technician applications, booking lifecycle writes, reminder runs, and payment webhooks without opening Firebase.
- Admin moderation now records explicit `technician_approved` / `technician_rejected` audit entries and sends follow-up emails when Resend is configured.
- `/admin/scooters` and `/admin/services` cover the brand, model, and service CRUD slice from the build plan, including compatible-brand / compatible-model relationships and slug generation.
- `/admin/reviews` gives admins a dedicated moderation queue with search, hidden/visible filters, and soft-hide / restore actions backed by audit logs.
- `/admin/bookings` centralizes booking triage, unpaid force-cancel actions, payment-link visibility, and MercadoPago refunds without requiring direct Firebase console access.
- `/admin/users` supports client-side search/filtering, profile drill-in, role changes that sync both custom claims and Firestore, plus suspend/restore actions that disable Firebase Auth access and schedule the existing 30-day purge flow.
- `/admin` now visualizes 30-day booking creation and GMV trends directly from Firestore snapshots, plus a status distribution card that makes daily ops triage quicker.
