# Tracker — Phase 15: Search, Filters & Discovery

> Status: ⬜ NOT STARTED
> Last updated: 2026-04-17

## Tasks

- [ ] Global search (scooters + services + technicians) with Firestore prefix matching
- [ ] Technician filters: service, neighborhood, price range, min rating
- [ ] Optional geolocation-based sorting
- [ ] All filter state shareable via URL params
- [ ] Search API endpoint

## Notes

- Firestore prefix matching is limited — consider algolia/typesense if full-text needed at scale
- URL params for filter state enables shareable links
