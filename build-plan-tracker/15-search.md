# Tracker - Phase 15: Search, Filters & Discovery

> Status: PARTIAL - debounced client search shipped, search-token indexing still pending
> Last updated: 2026-04-18

## Tasks

- [x] Global search (scooters + services + technicians) via `/api/search` + `/search`
- [x] Technician filters: service, neighborhood, price range, min rating
- [x] Optional geolocation-based sorting
- [x] All filter state shareable via URL params
- [x] Search API endpoint

## Notes

- Firestore prefix matching is limited - consider algolia/typesense if full-text needed at scale
- URL params for filter state enables shareable links
- Current MVP search uses normalized accent-insensitive matching in app code
- Future migration path documented in `knowledge-base/integrations/search-migration.md`
- Technician discovery now supports browser geolocation plus Uruguay location presets for approximate distance sorting
- Navbar and `/search` now share the same debounced live-search component with grouped preview results
