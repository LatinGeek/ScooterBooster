# Tracker - Phase 14: Notifications & WhatsApp

> Status: COMPLETE - in-app, email, WhatsApp deep-links, and reminder automation are wired
> Last updated: 2026-04-20

## Tasks

- [x] Email templates via React Email (Booking Created, Confirmed, Reminder, Completed, Cancelled, Technician Approved/Rejected)
- [x] Email sending integration (Resend or similar)
- [x] WhatsApp deep-links with pre-filled Spanish messages on confirmation pages
- [x] In-app notification bell with unread badge
- [x] Vercel Cron jobs for scheduled reminders (24h before appointment)

## Notes

- WhatsApp uses `wa.me` links only - no API, no bot.
- All notification content stays in Spanish.
- WhatsApp integration is documented in `knowledge-base/integrations/whatsapp.md`.
- User-facing in-app notifications now live under `users/{uid}/notifications/{id}` with a bell in the navbar/dashboard and a dedicated `/dashboard/notifications` center.
- Booking creation plus technician-driven status changes (`confirmed`, `in_progress`, `completed`, `cancelled_by_technician`) now create notifications asynchronously via `after()` so the API response stays fast.
- Resend-backed helpers now cover booking creation, confirmation, reminder, completion, cancellation, and technician moderation outcomes; if `RESEND_API_KEY` / `NOTIFICATION_FROM_EMAIL` are missing the app logs and skips delivery without failing the request.
- `/api/cron/booking-reminders` runs daily from Vercel cron at `12:00 UTC` (09:00 UY), fans out reminder emails + in-app notifications for tomorrow's confirmed bookings, and marks each booking with `reminderSentAt` to avoid duplicates.
