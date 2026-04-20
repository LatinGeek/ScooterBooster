# Tracker - Phase 14: Notifications & WhatsApp

> Status: PARTIAL - in-app notifications are live for users; email delivery and scheduled reminders still remain
> Last updated: 2026-04-20

## Tasks

- [ ] Email templates via React Email (Booking Created, Confirmed, Reminder, Completed, Cancelled, Technician Approved/Rejected)
- [ ] Email sending integration (Resend or similar)
- [ ] WhatsApp deep-links with pre-filled Spanish messages on confirmation pages
- [x] In-app notification bell with unread badge
- [ ] Vercel Cron jobs for scheduled reminders (24h before appointment)

## Notes

- WhatsApp uses `wa.me` links only - no API, no bot.
- All notification content stays in Spanish.
- WhatsApp integration is documented in `knowledge-base/integrations/whatsapp.md`.
- User-facing in-app notifications now live under `users/{uid}/notifications/{id}` with a bell in the navbar/dashboard and a dedicated `/dashboard/notifications` center.
- Booking creation plus technician-driven status changes (`confirmed`, `in_progress`, `completed`, `cancelled_by_technician`) now create notifications asynchronously via `after()` so the API response stays fast.
