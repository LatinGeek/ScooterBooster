# Tracker — Phase 03: Authentication & User Profiles

> Status: ✅ COMPLETE (core flows)
> Last updated: 2026-04-18

## Tasks

- [x] Google SSO login flow (Firebase Auth) — signInWithPopup via AuthProvider
- [x] Role-aware auth context (user/technician/admin) — custom claims in idTokenResult
- [x] Protected route middleware — src/proxy.ts (Next.js 16 renames middleware → proxy)
- [x] User profile creation on first login (setDoc in AuthProvider on first sign-in)
- [x] Onboarding flow (name + phone) — /onboarding/page.tsx
- [x] API routes: /api/auth/session, /api/auth/signout, /api/auth/me
- [x] Session management with Firebase session cookie + \_\_role optimistic cookie
- [x] AuthProvider added to root layout.tsx
- [x] Login page wrapped in Suspense (useSearchParams requires it — build fix)

## Deferred

- [ ] Profile editing page (/dashboard/profile) — shell exists, needs full implementation
- [ ] Firebase emulator integration test
- [ ] Seeding admin role manually (requires Firebase Console access)

## Notes

- Next.js 16 renamed `middleware.ts` → `proxy.ts` — the export function is also renamed `proxy()`
- `useSearchParams()` in client components requires `<Suspense>` wrapper at build time (SSG phase)
- AuthProvider does direct Firestore write (setDoc) for new users — OK for now, may need API route in future
- session.ts uses adminAuth.createSessionCookie (14-day expiry) + a non-httpOnly `__role` cookie for proxy optimistic checks
