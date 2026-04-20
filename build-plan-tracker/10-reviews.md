# Tracker - Phase 10: Reviews & Ratings

> Status: COMPLETE - public review flow, rating aggregation, and admin moderation are now live in dev
> Last updated: 2026-04-20

## Tasks

- [x] Review form - `src/components/review-form.tsx` (only shows after booking `status=completed`, no existing review)
- [x] Rating aggregation - precomputed on technician doc via Firestore transaction in `createReview()`
- [x] Review display on technician profiles - already implemented in Phase 07 (`ReviewCard` component)
- [x] API route `/api/reviews` fully implemented
  - POST: auth, ownership, completed status gate, duplicate prevention, rating aggregation
  - GET: fetch by `technicianId` query param
- [x] Review form wired into booking detail page with `hasReview` server-side check
- [x] Admin moderation (flag/hide)
  - `/admin/reviews` lists the full review stream with search plus visible/hidden filters
  - `/api/admin/reviews` lets admins hide or restore a review and records audit-log entries
- [ ] Edit window: 48h - deferred, immutable reviews are simpler for MVP
- [ ] Review-request notification via WhatsApp 24h after completion - still deferred

## Notes

- Rating aggregation uses a rolling average in a Firestore transaction, so we do not need Cloud Functions for MVP.
- Reviews are immutable for users; admin moderation now uses a soft-hide field so public listings can exclude problematic content without deleting the original record.
- Duplicate prevention is enforced with `getReviewByBooking()` before a new review is written.
- Public review queries now exclude hidden reviews by default, while the admin moderation view can opt in to the full dataset.
