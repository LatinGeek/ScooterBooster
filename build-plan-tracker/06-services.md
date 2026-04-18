# Tracker — Phase 06: Service Catalog + Legal Disclaimer

> Status: 🔶 PARTIAL — listing done, disclaimer enforcement in booking flow pending
> Last updated: 2026-04-18

## Tasks

- [x] Services listing page — 4 service cards with icons, prices, duration, disclaimer warning
- [x] DisclaimerModal component — src/components/disclaimer-modal.tsx (built in Phase 02)
- [ ] Service detail page (/services/[slug]) — deferred (listing page covers main use case for now)
- [ ] DisclaimerModal enforcement in booking flow — wired in Phase 08
- [ ] Store disclaimer acceptance in Firestore — handled in booking creation (bookings.disclaimerAccepted)
- [ ] Service-to-scooter compatibility matrix display — shown on scooter detail page (Phase 05)

## Notes

- Disclaimer text is in DisclaimerModal component — uses exact text from knowledge-base/services/speed-limit-disclaimer.md
- Services are fetched from Firestore via getActiveServices() (Admin SDK)
- requiresDisclaimer flag drives amber warning badge on service cards
- Booking flow (Phase 08) must check service.requiresDisclaimer and gate on DisclaimerModal
