# Phase 14 — Notifications & WhatsApp Integration

> **Goal:** Keep users and technicians informed via email + WhatsApp deep links. No WhatsApp API — only `wa.me` links.

## 14.1 — Email Provider

- [ ] Choose provider: Resend (recommended) or SendGrid
- [ ] Add `RESEND_API_KEY` to env
- [ ] Install: `npm i resend`
- [ ] Create `src/lib/email.ts` with `sendEmail({ to, subject, react })`

## 14.2 — Email Templates (React Email)

- [ ] Install `@react-email/components`
- [ ] Templates (all Spanish):
  - `BookingCreatedEmail` — to user, pending payment
  - `BookingConfirmedEmail` — to user + technician, post-payment
  - `BookingReminderEmail` — to user, 24h before
  - `BookingCompletedEmail` — to user, after technician marks complete, with review CTA
  - `BookingCancelledEmail` — to affected party
  - `TechnicianApprovedEmail` — to technician, on approval
  - `TechnicianRejectedEmail` — to applicant, with reason
- [ ] Use brand colors and footer with legal links

## 14.3 — Trigger Layer

- [ ] Create `src/lib/notifications.ts` with `notify(event, payload)`
- [ ] Call from API routes after successful DB writes
- [ ] Fire-and-forget via `after()` (Next.js 16) so it doesn't block response

## 14.4 — WhatsApp Deep Links

- [ ] Helper `formatWhatsAppLink(phone, message)` already in `src/lib/utils.ts`
- [ ] Use throughout UI: contact technician, send review reminder
- [ ] Pre-filled Spanish messages stored as constants in `src/lib/messages.ts`

## 14.5 — In-App Notifications

- [ ] Subcollection `users/{uid}/notifications/{id}` with `{ type, title, body, readAt?, createdAt }`
- [ ] Bell icon in navbar with unread badge
- [ ] `/dashboard/notifications` — list with mark-as-read

## 14.6 — Scheduled Reminders

- [ ] Add Vercel Cron job: `/api/cron/booking-reminders` runs daily at 09:00 UY
- [ ] Finds bookings starting tomorrow with status `confirmed`, sends reminder email
- [ ] Add `CRON_SECRET` to protect the endpoint

## Exit Criteria

- [ ] All 7 email templates rendered and tested
- [ ] WhatsApp links open correctly on iOS + Android
- [ ] In-app notifications real-time via `onSnapshot`
- [ ] Cron reminders verified on preview deployment
