# Phase 12 — Technician Dashboard

> **Goal:** Approved technicians manage their profile, availability, bookings, and earnings.

## 12.1 — Access Control

- [ ] `/dashboard/technician/*` requires `role === 'technician'` custom claim
- [ ] Middleware redirects other roles to `/dashboard` or `/`

## 12.2 — Overview

- [ ] `/dashboard/technician` — today's bookings, this week's earnings (net, after fee), average rating, pending requests count

## 12.3 — Bookings List

- [ ] `/dashboard/technician/bookings` — filterable by status, date range
- [ ] Quick actions: mark in progress, mark complete, contact user via WhatsApp
- [ ] Status transition via `PATCH /api/bookings/[id]` with role check

## 12.4 — Calendar View

- [ ] `/dashboard/technician/calendar` — week/month view with scheduled bookings
- [ ] Click a slot to see booking detail

## 12.5 — Availability

- [ ] `/dashboard/technician/availability` — weekly recurring + date overrides
- [ ] Toggle "vacation mode" to hide from listings temporarily

## 12.6 — Services & Pricing

- [ ] `/dashboard/technician/services` — select offered services, set own base price per service
- [ ] Store as subcollection `technicians/{uid}/pricing/{serviceId}`

## 12.7 — Earnings

- [ ] `/dashboard/technician/earnings` — list of completed bookings with base price (what they earn)
- [ ] CSV export button

## 12.8 — Reviews Received

- [ ] `/dashboard/technician/reviews` — read-only list
- [ ] Can reply to reviews (stored as `reviews/{id}.technicianReply`, max 300 chars)

## Exit Criteria

- [ ] Technician can fully manage their practice from the dashboard
- [ ] All transitions wired to API
- [ ] Real-time booking notifications (Firestore listener)
