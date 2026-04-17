# Tracker — Phase 06: Service Catalog + Legal Disclaimer

> Status: ⬜ NOT STARTED
> Last updated: 2026-04-17

## Tasks

- [ ] Services listing page (4 services with cards)
- [ ] Service detail with pricing, duration, compatibility
- [ ] DisclaimerModal component (mandatory for speed-limit-removal)
- [ ] Modal: cannot close without explicit checkbox + timestamp audit trail
- [ ] Store disclaimer acceptance in Firestore (bookings.disclaimerAccepted + timestamp)
- [ ] Service-to-scooter compatibility matrix display

## Notes

- Speed limit disclaimer text is in knowledge-base/services/speed-limit-disclaimer.md — use EXACTLY as written
- Any service with category=speed-limit MUST trigger the modal before booking
- Disclaimer acceptance must be stored with userId + timestamp for legal compliance
- Page shell exists at src/app/(main)/services/page.tsx
