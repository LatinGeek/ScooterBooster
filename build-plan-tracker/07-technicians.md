# Tracker - Phase 07: Technicians (Onboarding, Profiles, Approval)

> Status: COMPLETE - apply, moderation, request-changes, profile editing, availability, and resized photo uploads are all live in dev
> Last updated: 2026-04-21

## Tasks

- [x] Public `/technicians` listing - sorted, filterable, and proximity-aware
- [x] Public technician profile page (`/technicians/[id]`) - availability, pricing, reviews, brands, WhatsApp CTA
- [x] `/technicians/apply` - application form for logged-in users
- [x] Pending approval state for new technicians
- [x] Admin approval flow - approve/reject in admin panel, with custom claim updated on approval/revocation
- [x] Technician profile editing basics via `/api/technicians/me`
- [x] Availability management baseline in `/dashboard/technician/availability`
- [x] Dedicated technician profile edit screen in dashboard
- [x] Photo upload with resizing
- [x] Rich rejection / request-changes workflow

## Notes

- Technician applications now create pending documents in Firestore, seed an initial price matrix from a single base price, and log an `auditLog` event for admin visibility.
- Pending applications stay visible on the apply page so the applicant always sees their current status instead of re-submitting blindly.
- The admin moderation route now updates Firebase custom claims when a technician is approved or revoked, which closes one of the most important lifecycle gaps from the original plan.
- Technicians can now edit their public-facing profile from `/dashboard/technician/profile`, including bio, location, contact data, active status, and a server-side image pipeline that resizes uploads to `512x512` plus `128x128` before storing them in Firebase Storage.
- Admins can now choose between approve, request changes, and reject from `/admin/technicians`, with moderation notes persisted back to the applicant and surfaced on the resubmission form.
