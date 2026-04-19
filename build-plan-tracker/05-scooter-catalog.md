# Tracker — Phase 05: Scooter Catalog

> Status: ✅ COMPLETE
> Last updated: 2026-04-19

## Tasks

- [x] Scooters listing page — grouped by brand with model cards showing specs
- [x] ScooterCard component — src/components/scooter-card.tsx
- [x] Scooter detail page — specs grid, compatible services, compatible technicians section
- [x] Server-side data fetching from Firestore (Admin SDK, force-dynamic)
- [x] SEO metadata via generateMetadata on detail page
- [x] (main)/layout.tsx created — Navbar added
- [x] Seed catalog expanded with image-backed Xiaomi, Atom, Joyor, MiStyle, and Navee models
- [x] Catalog and booking wizard now render seeded model images when available

## Deferred

- [ ] Client-side filters (brand, category) — deferred, brand grouping serves the same purpose
- [ ] Search API — deferred to Phase 15
- [ ] JSON-LD structured data per model — deferred to Phase 16
- [ ] ISR — switched to force-dynamic (build sandbox has no internet to Firestore at build time)

## Notes

- ISR (`export const revalidate`) fails in the build sandbox (no internet → Firestore DNS fails).
  Use `export const dynamic = "force-dynamic"` for all Firestore-dependent pages during dev.
  ISR can be re-enabled when deployed to Vercel (has internet access).
- ScooterCard routes to `/scooters/[model.slug]` — slug is the URL param, not doc ID.
- `npx tsx scripts/seed.ts` now populates 50+ demo models, including the asset-backed scooter catalog under `public/assets/scooter-model-images`.
