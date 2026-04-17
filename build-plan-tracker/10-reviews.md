# Tracker — Phase 10: Reviews & Ratings

> Status: ⬜ NOT STARTED
> Last updated: 2026-04-17

## Tasks

- [ ] Review form (only after booking status=completed)
- [ ] Rating aggregation (precomputed on technician document)
- [ ] Review display on technician profiles
- [ ] Edit window: 48 hours after submission
- [ ] Admin moderation (flag/hide reviews)
- [ ] Review-request notification trigger
- [ ] API route /api/reviews fully implemented

## Notes

- Rating system documented in knowledge-base/technicians/rating-system.md
- 1-5 stars, 10-500 character comment
- Minimum 3.0 average after 10+ reviews to stay active on platform
- Firestore rule: only bookings.userId can create review for that booking
