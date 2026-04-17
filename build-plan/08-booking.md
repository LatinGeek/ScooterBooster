# Phase 08 — Booking Flow

> **Goal:** Smooth booking flow from scooter/service selection to confirmed booking awaiting payment.

## 8.1 — Booking State Machine

Define `BookingStatus` as a strict union:

- `pending_payment` → awaiting MercadoPago checkout
- `confirmed` → paid, scheduled
- `in_progress` → technician marked started
- `completed` → technician marked done
- `cancelled_by_user`
- `cancelled_by_technician`
- `expired` → payment link expired

- [ ] Document allowed transitions in `knowledge-base/integrations/firebase-schema.md`
- [ ] Enforce transitions in server-side `updateBookingStatus()` with a switch

## 8.2 — Booking Creation UI

Entry points:

- From scooter detail page → service selected → technician selected
- From service detail page → technician selected → scooter model selected
- From technician profile → service selected → scooter model selected

- [ ] Wizard `src/app/(main)/booking/new/page.tsx` with stepper:
  1. Scooter model
  2. Service
  3. Technician
  4. Date & time (from technician availability)
  5. Review + disclaimer (if needed)
  6. Confirm → go to payment
- [ ] Persist wizard state in URL search params so refresh doesn't lose progress
- [ ] Show pricing breakdown (base + fee) at every step after technician selected

## 8.3 — Booking API

- [ ] `POST /api/bookings` — Zod-validated body
  - Verifies user is authenticated
  - Verifies technician is approved
  - Verifies service is compatible with scooter model
  - If service requires disclaimer, requires `disclaimerAcceptedAt`
  - Calculates `basePrice`, `feeAmount`, `totalAmount`
  - Creates booking with status `pending_payment`
  - Returns booking ID
- [ ] `GET /api/bookings/[id]` — owner, technician, or admin only
- [ ] `PATCH /api/bookings/[id]` — status transitions with role checks
- [ ] `POST /api/bookings/[id]/cancel` — user or technician, within cancellation window

## 8.4 — Booking Detail Page

- [ ] `src/app/(main)/booking/[id]/page.tsx`
- [ ] Show status, scheduled time, scooter, service, technician, prices, payment status
- [ ] CTAs based on status + role (pay now, cancel, mark in progress, mark complete, review)

## 8.5 — Conflict Prevention

- [ ] Before creating booking, check that the technician's slot is not already booked
- [ ] Use a Firestore transaction to prevent double booking

## 8.6 — Cancellation Policy

- [ ] Free cancellation up to 24h before `scheduledAt`
- [ ] Within 24h: user forfeits fee portion (or per product decision)
- [ ] Document in `knowledge-base/platform/monetization.md`

## 8.7 — Notifications (Stub)

- [ ] On booking create: email stub to user (real impl Phase 14)
- [ ] On booking confirm (post-payment): WhatsApp link sent to user

## Exit Criteria

- [ ] Booking wizard works on mobile and desktop
- [ ] Pricing breakdown always matches server calc
- [ ] Conflict prevention verified with concurrent-test
- [ ] All status transitions enforced server-side
- [ ] Disclaimer enforced before creating booking for relevant services
