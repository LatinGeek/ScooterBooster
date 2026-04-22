# Tracker — Phase 04: Firestore Schema, Rules & Seed Data

> Status: BLOCKED - the repo-side schema, DAL, indexes, seed data, and rules work are complete; the only remaining gap is deployed Firestore rules in the real target environment
> Last updated: 2026-04-22

## Tasks

- [x] Write final Firestore security rules (`firestore.rules`)
- [x] Write Firestore composite indexes (`firestore.indexes.json`)
- [x] Typed data access layer — `src/lib/db/{brands,models,services,technicians,bookings,reviews}.ts`
- [x] Seed script — `scripts/seed.ts` (7 brands, 23 models, 4 services, 3 demo technicians)
- [x] `tsx` + `dotenv` installed for running seed script (`npm run seed`)
- [x] `paymentLinks` + `auditLog` DAL files
- [ ] Deploy rules — blocked on Firebase project access / target environment credentials
- [x] Deploy indexes

## Notes

- All DAL files are Admin SDK only (server-side). No client-side Firestore writes for catalog data.
- Seed uses deterministic document IDs (e.g. `brand-xiaomi`, `speed-limit`) so the script is idempotent.
- Run seed: `npm run seed` — requires `.env.local` with `FIREBASE_ADMIN_*` vars set.
- `getServicesByIds` uses Firestore `__name__ in [...]` for batch fetching (chunked to 10 per query limit).
- DAL functions for technicians support optional filtering by `serviceId` and `brandId` for catalog display.
- `firestore.indexes.json` now covers the composite queries used by catalog, booking, reviews, and technician discovery pages.
- `npm run test:rules` shells through `firebase emulators:exec` and requires Java so the Firestore emulator can start.
- MercadoPago preferences are now mirrored in a dedicated `paymentLinks` collection so webhook and refund flows can keep payment-link history outside the booking document itself.
