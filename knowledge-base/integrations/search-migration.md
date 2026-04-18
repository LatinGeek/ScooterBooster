# Search Migration Notes

## Current MVP Strategy

- Use normalized string matching in the app layer for scooters, services, and technicians.
- Keep technician filters shareable through URL params so search state is stable even before a dedicated search engine exists.
- Store future-friendly search metadata in seeds and write paths (`searchTokens`, normalized locations) when we extend Firestore documents.

## When To Migrate

Move from Firestore-backed MVP search to Algolia or Typesense when:

- Search latency becomes noticeable with larger catalogs.
- Relevance ranking needs typo tolerance, synonyms, or weighted fields.
- Users expect full-text search across large technician and booking datasets.

## Migration Outline

1. Add a sync job or webhook-driven indexer from Firestore to the search engine.
2. Mirror core entities: `scooterModels`, `services`, `technicians`.
3. Preserve current URL param contract so the UI does not need a routing rewrite.
4. Keep `/api/search` as the stable backend-for-frontend surface and swap its data source.
