# Phase 11 — User Dashboard

> **Goal:** Logged-in users can see their bookings, history, and manage their account.

## 11.1 — Layout

- [ ] `src/app/dashboard/layout.tsx` — sidebar with links: Mis reservas, Perfil, Cerrar sesión
- [ ] Mobile: top tab bar instead of sidebar

## 11.2 — My Bookings

- [ ] `/dashboard` (default tab) — lists user's bookings grouped by Upcoming / Past / Cancelled
- [ ] Card shows: date, service, technician, status badge, price
- [ ] Click opens booking detail page

## 11.3 — Upcoming Actions

- [ ] For `pending_payment`: CTA "Pagar ahora"
- [ ] For `confirmed`: CTA "Contactar técnico" (WhatsApp) + "Cancelar" if within policy
- [ ] For `completed` without review: CTA "Dejar reseña"

## 11.4 — Profile Tab

- [ ] `/dashboard/profile` — edit name, phone, avatar, WhatsApp consent
- [ ] Delete account (soft-delete)

## 11.5 — Empty States

- [ ] If no bookings: illustration + "Aún no tenés reservas" + CTA "Explorar servicios"

## Exit Criteria

- [ ] Dashboard loads < 2s on 4G
- [ ] All CTAs wired up
- [ ] Real-time updates via Firestore `onSnapshot` for booking status changes
