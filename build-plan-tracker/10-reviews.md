# Tracker — Phase 10: Reviews & Ratings

> Status: ✅ COMPLETE (core flow done; admin moderation + review notification deferred)
> Last updated: 2026-04-18

## Tasks

- [x] Review form — src/components/review-form.tsx (only shows after booking status=completed, no existing review)
- [x] Rating aggregation — precomputed on technician doc via Firestore transaction in createReview()
- [x] Review display on technician profiles — already implemented in Phase 07 (ReviewCard component)
- [x] API route /api/reviews fully implemented
  - POST: auth, ownership, completed status gate, duplicate prevention, rating aggregation
  - GET: fetch by technicianId query param
- [x] ReviewForm wired into booking detail page with hasReview server-side check
- [ ] Edit window: 48h — deferred, immutable reviews simpler for MVP
- [ ] Admin moderation (flag/hide) — Phase 13
- [ ] Review-request notification via WhatsApp 24h after completion — Phase 14

## Notes

- Rating aggregation: rolling average in Firestore transaction (no Cloud Functions needed for MVP)
- Reviews are immutable for users — admin can soft-delete via hidden field (Phase 13)
- Duplicate prevention: getReviewByBooking() check before createReview()
- FUSE null-byte corruption fixed: bookings.ts and webhook/route.ts rewritten to clean state
