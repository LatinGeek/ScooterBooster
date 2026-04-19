# Tracker â€” Phase 04: Firestore Schema, Rules & Seed Data

> Status: PARTIAL - composite indexes are deployed, and Firestore rules plus emulator-backed rule tests are now in repo
> Last updated: 2026-04-19

## Tasks

- [x] Write final Firestore security rules (`firestore.rules`)
- [x] Write Firestore composite indexes (firestore.indexes.json)
- [x] Typed data access layer â€” src/lib/db/{brands,models,services,technicians,bookings,reviews}.ts
- [x] Seed script â€” scripts/seed.ts (7 brands, 23 models, 4 services, 3 demo technicians)
- [x] tsx + dotenv installed for running seed script (`npm run seed`)
- [ ] paymentLinks + auditLog DAL files â€” deferred to Phase 09/10
- [ ] Deploy rules â€” needs Firebase project access (credentials via Vercel dashboard)
- [x] Deploy indexes

## Notes

- All DAL files are Admin SDK only (server-side). No client-side Firestore writes for catalog data.
- Seed uses deterministic document IDs (e.g. "brand-xiaomi", "speed-limit") so script is idempotent.
- Run seed: `npm run seed` â€” requires .env.local with FIREBASE*ADMIN*\* vars set.
- `getServicesByIds` uses Firestore `__name__ in [...]` for batch fetching (chunked to 10 per query limit).
- DAL functions for technicians support optional filtering by serviceId and brandId for catalog display.
- `firestore.indexes.json` now covers the composite queries used by catalog, booking, reviews, and technician discovery pages.
- `npm run test:rules` shells through `firebase emulators:exec` and requires Java so the Firestore emulator can start.


