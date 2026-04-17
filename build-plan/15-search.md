# Phase 15 — Search, Filters & Discovery

> **Goal:** Fast, relevant search across scooters, services, and technicians.

## 15.1 — Global Search

- [ ] Navbar search input (desktop) + sheet (mobile)
- [ ] Debounced client search → `GET /api/search?q=`
- [ ] Returns grouped results: scooters, services, technicians

## 15.2 — Index Strategy

For MVP, use Firestore queries with prefix matching on normalized fields:
- [ ] Add `searchTokens: string[]` field to each indexed doc (lowercase, accent-stripped, split by whitespace)
- [ ] Query with `array-contains-any`

For future scale, document migration to Algolia or Typesense in `knowledge-base/integrations/search-migration.md`.

## 15.3 — Technician Filters

- [ ] By service (multi-select)
- [ ] By neighborhood (Montevideo zones + major cities)
- [ ] Price range slider
- [ ] Min rating
- [ ] Apply filters to URL as search params; shareable links

## 15.4 — Location-Based Discovery

- [ ] Optional: ask for geolocation, sort by distance
- [ ] Fallback: neighborhood select
- [ ] Store tech `serviceArea` as GeoPoint + radius km (phase 2) OR simple neighborhood tag (MVP)

## 15.5 — Empty / Zero-Result States

- [ ] Specific messaging per filter combination
- [ ] "Limpiar filtros" CTA always visible

## Exit Criteria

- [ ] Search returns results < 500 ms
- [ ] Filter URLs shareable
- [ ] Accent-insensitive search works ("montevideo" finds "Montevideo")
