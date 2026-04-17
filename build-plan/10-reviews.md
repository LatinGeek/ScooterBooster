# Phase 10 — Reviews & Ratings

> **Goal:** Users leave reviews after completed bookings; technician rating is computed and displayed.

## 10.1 — Review Model & Rules

- [ ] Schema per Phase 04
- [ ] Firestore rule: create allowed only if `bookings/{bookingId}.userId == request.auth.uid` and `status == 'completed'` and no existing review for that booking
- [ ] No edits, no deletes (admin can soft-delete via `hidden: true`)

## 10.2 — Create Review UI

- [ ] From `/booking/[id]` when status is `completed` and no review yet
- [ ] `RatingStars` interactive (1–5), textarea for comment (max 500 chars)
- [ ] Submit via `POST /api/reviews`

## 10.3 — Rating Aggregation

- [ ] On review create: Cloud Function OR server API triggers recalculation of technician `rating` and `reviewCount`
- [ ] Store as precomputed fields to avoid runtime aggregation
- [ ] Use Firestore transaction to avoid race conditions

## 10.4 — Reviews Display

- [ ] Technician profile page shows latest 5, with "Ver más" → paginated list
- [ ] Each review: stars, reviewer first name + last initial, date (relative: "hace 3 días"), comment
- [ ] Filter: stars (all, 5, 4, …)

## 10.5 — Moderation

- [ ] Admin can flag/hide reviews from `/admin/reviews`
- [ ] Hidden reviews don't appear publicly but stay in DB
- [ ] Log moderation actions to `auditLog`

## 10.6 — Review Request Notification

- [ ] 24h after booking marked `completed`, send the user a WhatsApp pre-filled message asking for a review

## Exit Criteria

- [ ] Reviews creatable only from completed bookings
- [ ] Technician ratings update correctly
- [ ] Admin moderation working
- [ ] Review notification sent
