# Phase 07 — Technicians (Onboarding, Profiles, Approval)

> **Goal:** End-to-end technician lifecycle: apply → be approved → manage profile → receive bookings.

## 7.1 — Apply-to-Be-a-Technician Flow

- [ ] Route `/technicians/apply` (requires login as `user` role)
- [ ] Form (Zod-validated): bio, specialties (multi-select from services), base price, service area (neighborhood/list), whatsappNumber (UY format), photoUrl (upload to Storage)
- [ ] On submit: `POST /api/technicians/apply` creates `technicians/{uid}` with `approved: false`
- [ ] Show pending-approval page after submission
- [ ] Notify admin via audit log entry

## 7.2 — Admin Approval

- [ ] `/admin/technicians` lists pending applications
- [ ] Admin can approve, reject (with reason), or request changes
- [ ] On approve: set `approved: true`, update user role to `technician` via custom claim, log to `auditLog`
- [ ] On reject: store rejection reason, keep `approved: false`

## 7.3 — Technician Listing (Public)

- [ ] `src/app/(main)/technicians/page.tsx`
- [ ] Only shows `approved === true`
- [ ] Default sort: rating desc
- [ ] Filter by: specialty, neighborhood, price range, minimum rating
- [ ] Pagination (20 per page) or infinite scroll

## 7.4 — Technician Profile Page

- [ ] `src/app/(main)/technicians/[id]/page.tsx`
- [ ] Sections: photo, name, bio, specialties, rating + review count, base price, service area, WhatsApp button
- [ ] Reviews section (from Phase 10)
- [ ] "Reservar servicio" CTA → booking flow pre-filled with this technician

## 7.5 — Technician Profile Edit

- [ ] `/dashboard/technician/profile` — same form as apply, but edit mode
- [ ] Changes to pricing require admin re-approval (flag `pendingReapproval: true` — optional, decide with product)

## 7.6 — Availability Management

- [ ] Availability model: weekly recurring slots (e.g. `{ monday: [{ start: '09:00', end: '18:00' }], ... }`) + date-specific overrides
- [ ] Store on `technicians/{uid}.availability`
- [ ] UI in `/dashboard/technician/availability`

## 7.7 — Photo Upload

- [ ] Upload via Firebase Storage, path `technicians/{uid}/profile.jpg`
- [ ] Resize server-side to 512×512 and 128×128 (use a server route with `sharp`)
- [ ] Validate MIME type and size (≤ 2 MB)

## Exit Criteria

- [ ] User can apply; admin can approve/reject
- [ ] Approved technicians visible in public listing
- [ ] Technician can edit profile and set availability
- [ ] Photo upload and resize working
- [ ] Custom claim `role: 'technician'` set on approval
