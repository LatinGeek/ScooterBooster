# Phase 13 — Admin Panel

> **Goal:** Admin can approve technicians, manage catalog, view analytics, handle disputes.

## 13.1 — Access Control

- [ ] `/admin/*` requires `role === 'admin'` custom claim
- [ ] Middleware blocks all others with 403

## 13.2 — Overview Dashboard

- [ ] `/admin` — KPIs: total users, technicians (approved / pending), bookings by status, total GMV, platform revenue (fees), reviews count
- [ ] Graphs: bookings over last 30 days, GMV over last 30 days

## 13.3 — Technicians Management

- [ ] `/admin/technicians` — tabs: Pending, Approved, Rejected
- [ ] Approve / reject / request changes actions
- [ ] Edit any technician's profile (override)

## 13.4 — Catalog Management

- [ ] `/admin/scooters` — CRUD for brands + models
- [ ] `/admin/services` — CRUD for services, edit `requiresDisclaimer`, compatibility matrix
- [ ] Image upload via Firebase Storage

## 13.5 — Bookings Admin

- [ ] `/admin/bookings` — full list, filter by status / date / technician / user
- [ ] View details, force-cancel, refund via MP

## 13.6 — Users Admin

- [ ] `/admin/users` — list, search by email, view profile, grant/revoke admin role
- [ ] Soft-delete user

## 13.7 — Reviews Moderation

- [ ] `/admin/reviews` — list, hide/unhide, filter flagged

## 13.8 — Audit Log Viewer

- [ ] `/admin/audit` — read-only view of `auditLog` collection
- [ ] Filter by action, actor, target

## 13.9 — Settings

- [ ] `/admin/settings` — edit `SERVICE_FEE_PERCENTAGE` (stored in Firestore `config/global`)
- [ ] Read at runtime; change effective immediately for new bookings

## Exit Criteria

- [ ] Admin can do everything needed to operate the platform without touching Firebase console
- [ ] All write actions audit-logged
- [ ] No admin operation bypasses server-side validation
