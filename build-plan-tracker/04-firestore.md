# Tracker — Phase 04: Firestore Schema, Rules & Seed Data

> Status: ⬜ NOT STARTED
> Last updated: 2026-04-17

## Tasks

- [ ] Write final Firestore security rules (firestore.rules)
- [ ] Write Firestore composite indexes (firestore.indexes.json)
- [ ] Create typed data access layer in src/lib/db/ (one file per collection)
- [ ] Write seed script: brands, models, services, demo technicians
- [ ] Add extra collections: paymentLinks, auditLog
- [ ] Deploy rules + indexes to dev project

## Notes

- Firebase schema is fully documented in knowledge-base/integrations/firebase-schema.md
- Collections: users, technicians, scooterBrands, scooterModels, services, bookings, reviews, paymentLinks, auditLog
- Public reads allowed for: scooterBrands, scooterModels, services, approved technicians
- All writes require auth; role-checked via custom claims
- Needs Phase 00 (Firebase project access)
