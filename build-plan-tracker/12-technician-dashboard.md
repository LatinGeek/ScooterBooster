# Tracker — Phase 12: Technician Dashboard

> Status: ✅ COMPLETE (calendar view deferred — tab-based bookings management covers MVP)
> Last updated: 2026-04-18

## Tasks

- [x] Access control — proxy.ts already enforces technician role for /dashboard/technician/*
- [x] Layout — sidebar (desktop) + tab bar (mobile) with 6 nav items
- [x] Overview page — KPI cards (today's bookings, pending, weekly earnings, avg rating) + upcoming list + quick links
- [x] Bookings list — tabs (Pending/Upcoming/History/Cancelled) + status transitions + WhatsApp contact + real-time subscription
- [ ] Calendar view — deferred (bookings list covers MVP use case)
- [x] Availability — weekly schedule toggles + start/end times + vacation mode toggle
- [x] Services & Pricing — toggle services, set base price, see client price (base +10%), toggle supported brands
- [x] Earnings — completed bookings table + total summary + CSV export
- [x] Reviews — star display + technician reply form (max 300 chars)
- [x] API: GET + PATCH /api/technicians/me
- [x] API: PATCH /api/reviews/[id] — technician reply
- [x] DAL: updateTechnicianProfile() in src/lib/db/technicians.ts
- [x] DAL: setTechnicianReply() in src/lib/db/reviews.ts
- [x] Type: Review.technicianReply + Review.technicianRepliedAt added to Review interface

## Notes

- Availability format: { monday: { start: "09:00", end: "18:00", isAvailable: true }, ... }
- WhatsApp contact in bookings uses booking.userId (UID not phone) — Phase 14 should add proper wa.me links when user phone is stored.
- Earnings shows basePrice only (tech's cut), not totalPrice. Intentional.
- Review replies stored on review doc as technicianReply field (not subcollection).
