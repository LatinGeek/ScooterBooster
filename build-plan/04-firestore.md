# Phase 04 — Firestore Schema, Rules & Seed Data

> **Goal:** Finalize every collection, enforce security rules, add composite indexes, and seed initial data.

## 4.1 — Collections Finalized

For each collection below, confirm the schema in `knowledge-base/integrations/firebase-schema.md` matches `src/types/index.ts`, then lock it:

- [ ] `users` — `{ uid, email, fullName, phone, role, avatarUrl?, createdAt, updatedAt, deletedAt? }`
- [ ] `technicians` — `{ uid, bio, specialties[], basePrice, availability, serviceArea, approved, rating, reviewCount, whatsappNumber, photoUrl, createdAt }`
- [ ] `scooterBrands` — `{ id, name, slug, logoUrl, createdAt }`
- [ ] `scooterModels` — `{ id, brandId, name, slug, year, specs: { topSpeedKmh, batteryWh, weightKg, rangeKm }, imageUrl, firmwareLockable, createdAt }`
- [ ] `services` — `{ id, name, slug, description, category, startingPrice, requiresDisclaimer, compatibleModelIds[], active }`
- [ ] `bookings` — `{ id, userId, technicianId, scooterModelId, serviceId, scheduledAt, status, basePrice, feeAmount, totalAmount, paymentLinkId?, disclaimerAcceptedAt?, notes?, createdAt, updatedAt }`
- [ ] `reviews` — `{ id, bookingId, userId, technicianId, rating, comment, createdAt }`
- [ ] `paymentLinks` — `{ id, bookingId, mpPreferenceId, initPoint, status, createdAt }`
- [ ] `auditLog` — `{ id, actorUid, action, targetType, targetId, metadata, createdAt }`

## 4.2 — Firestore Security Rules

- [ ] Write `firestore.rules` enforcing:
  - All reads/writes require auth unless explicitly public
  - `users`: user can read/write own doc; admin can read any
  - `technicians`: public read when `approved === true`; only owner can write; admin approves
  - `scooterBrands`, `scooterModels`, `services`: public read; admin write only
  - `bookings`: user can read own; technician can read assigned; admin reads all; server-only writes
  - `reviews`: public read; create only if user has a completed booking with that technician; no edit/delete
  - `paymentLinks`, `auditLog`: server-only (Admin SDK)
- [ ] Write unit tests for rules using `@firebase/rules-unit-testing`
- [ ] Run rules tests in CI
- [ ] Deploy to `scooterbooster-dev`: `firebase deploy --only firestore:rules`

## 4.3 — Composite Indexes

- [ ] Add indexes in `firestore.indexes.json`:
  - `technicians` where `approved==true` ordered by `rating desc`
  - `bookings` where `userId==X` ordered by `scheduledAt desc`
  - `bookings` where `technicianId==X` ordered by `scheduledAt desc`
  - `reviews` where `technicianId==X` ordered by `createdAt desc`
  - `scooterModels` where `brandId==X` ordered by `name asc`
- [ ] Deploy: `firebase deploy --only firestore:indexes`

## 4.4 — Seed Data

- [ ] Create `scripts/seed.ts` using Firebase Admin SDK
- [ ] Import brands/models from `knowledge-base/scooters/brands-and-models.md` (all 7 brands, 30+ models)
- [ ] Import services from `knowledge-base/services/catalog.md` (4 services)
- [ ] Seed 3 demo technicians (approved, with plausible UY coordinates for Montevideo)
- [ ] Run seed against dev: `npx tsx scripts/seed.ts --project=dev`
- [ ] Verify via MCP or Firestore console
- [ ] Document seed script in `README.md`

## 4.5 — Data Access Layer

- [ ] Create `src/lib/db/` folder with one file per collection
- [ ] Each file exports typed functions (e.g. `getTechnicianById`, `listApprovedTechnicians`, `createBooking`)
- [ ] All functions use Zod validators on input and parse on output
- [ ] Client-side vs server-side variants where needed

## 4.6 — Firestore Timestamps

- [ ] Adopt a consistent pattern: always store `serverTimestamp()`, always read via a converter that returns ISO strings for the client
- [ ] Add converter helpers in `src/lib/firestore-converters.ts`

## Exit Criteria

- [ ] All collections created with data
- [ ] Rules deployed and passing tests
- [ ] Indexes deployed
- [ ] Seed script reproducible
- [ ] Data access layer fully typed
