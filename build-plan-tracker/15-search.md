# Tracker - Phase 15: Search, Filters & Discovery

> Status: PARTIAL - core search and shareable technician filters shipped, geolocation/debounced UX pending
> Last updated: 2026-04-18

## Tasks

- [x] Global search (scooters + services + technicians) via `/api/search` + `/search`
- [x] Technician filters: service, neighborhood, price range, min rating
- [ ] Optional geolocation-based sorting
- [x] All filter state shareable via URL params
- [x] Search API endpoint

## Notes

- Firestore prefix matching is limited - consider algolia/typesense if full-text needed at scale
- URL params for filter state enables shareable links
- Current MVP search uses normalized accent-insensitive matching in app code
- Future migration path documented in `knowledge-base/integrations/search-migration.md`
