# Tracker - Phase 06: Service Catalog + Legal Disclaimer

> Status: PARTIAL - listing, detail pages, and disclaimer enforcement are live; richer compatibility/explainer content can still improve
> Last updated: 2026-04-19

## Tasks

- [x] Services listing page - 4 service cards with icons, prices, duration, and disclaimer warning
- [x] DisclaimerModal component - `src/components/disclaimer-modal.tsx`
- [x] Service detail page (`/services/[slug]`)
- [x] DisclaimerModal enforcement in booking flow
- [x] Store disclaimer acceptance in Firestore (`bookings.disclaimerAccepted*`)
- [x] Service-to-scooter compatibility matrix display via linked compatible scooter catalog
- [ ] Rich before/after FAQs or deeper service education content

## Notes

- The new service detail route links each service to compatible scooters and approved technicians, which closes the biggest gap from the original plan without waiting for prod.
- Disclaimer text still comes from the shared modal and is enforced before users can confirm speed-limit bookings.
- Listing and detail pages both point users straight into the booking flow so the catalog remains actionable in dev QA.
