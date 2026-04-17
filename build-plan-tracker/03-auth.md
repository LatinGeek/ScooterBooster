# Tracker — Phase 03: Authentication & User Profiles

> Status: ⬜ NOT STARTED
> Last updated: 2026-04-17

## Tasks

- [ ] Google SSO login flow (Firebase Auth) — use-auth.ts exists, needs wiring
- [ ] Role-aware auth context (user/technician/admin)
- [ ] Protected route middleware (Next.js middleware.ts)
- [ ] User profile creation on first login (write to Firestore users collection)
- [ ] Onboarding flow (name + phone collection)
- [ ] Profile editing page
- [ ] API routes: /api/auth/session, /api/auth/signout, /api/auth/me
- [ ] Session management with Firebase custom claims for roles

## Notes

- use-auth.ts and use-firestore.ts hooks already exist as stubs
- Firebase lazy init pattern already implemented in firebase.ts
- Needs Phase 00 (Firebase project) to test end-to-end
