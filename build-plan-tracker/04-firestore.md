# Tracker — Phase 04: Firestore Schema, Rules & Seed Data

> Status: 🔶 PARTIAL — DAL done, rules/indexes pending Firebase access
> Last updated: 2026-04-18

## Tasks

- [ ] Write final Firestore security rules (firestore.rules) — needs Firebase CLI access
- [ ] Write Firestore composite indexes (firestore.indexes.json) — needs Firebase CLI access
- [x] Typed data access layer — src/lib/db/{brands,models,services,technicians,bookings,reviews}.ts
- [x] Seed script — scripts/seed.ts (7 brands, 23 models, 4 services, 3 demo technicians)
- [x] tsx + dotenv installed for running seed script (`npm run seed`)
- [ ] paymentLinks + auditLog DAL files — deferred to Phase 09/10
- [ ] Deploy rules + indexes — needs Firebase project access (credentials via Vercel dashboard)

## Notes

- All DAL files are Admin SDK only (server-side). No client-side Firestore writes for catalog data.
- Seed uses deterministic document IDs (e.g. "brand-xiaomi", "speed-limit") so script is idempotent.
- Run seed: `npm run seed` — requires .env.local with FIREBASE*ADMIN*\* vars set.
- `getServicesByIds` uses Firestore `__name__ in [...]` for batch fetching (chunked to 10 per query limit).
- DAL functions for technicians support optional filtering by serviceId and brandId for catalog display.
