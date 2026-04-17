# Phase 03 — Authentication & User Profiles

> **Goal:** Google SSO login, role-aware sessions, protected routes, and a user profile collection.

## 3.1 — Firebase Auth Config

- [ ] Verify Google provider is enabled in both `scooterbooster-dev` and `scooterbooster-prod`
- [ ] Add `localhost` and `scooterbooster.uy` to authorized domains
- [ ] Decide on session strategy: Firebase ID token + Next.js middleware cookie

## 3.2 — Auth Hook & Context

- [ ] Finalize `src/hooks/use-auth.ts` — expose `user`, `loading`, `signInWithGoogle`, `signOut`, `role`
- [ ] Create `src/providers/auth-provider.tsx` wrapping the app
- [ ] Add to `src/app/layout.tsx`
- [ ] Handle `onAuthStateChanged` with emulator compatibility

## 3.3 — Server-Side Session

- [ ] Add `src/lib/session.ts` — reads ID token from cookie, verifies via Admin SDK
- [ ] Create `src/middleware.ts` — refreshes session cookie, attaches `role` claim
- [ ] Protect `/dashboard`, `/dashboard/technician`, `/admin` routes
- [ ] Redirect unauthenticated users to `/login?redirect=<path>`

## 3.4 — Role Management

- [ ] On first sign-in, create a `users/{uid}` doc with `role: 'user'`
- [ ] Create admin-only API `POST /api/admin/set-role` that sets Firebase custom claims
- [ ] Seed one admin manually via MCP (your personal Google account)
- [ ] Document role-switching flow in `knowledge-base/platform/roles-and-permissions.md`

## 3.5 — Login Page

- [ ] Polish `src/app/(auth)/login/page.tsx` per design system
- [ ] Handle loading and error states (show Spanish messages)
- [ ] Redirect to `?redirect` param after successful login, defaulting to `/`
- [ ] Add "Continuar con Google" button; no other options

## 3.6 — Profile Completion

- [ ] After first login, if `users/{uid}.phone` is missing, redirect to `/onboarding`
- [ ] `/onboarding` asks for: `fullName`, `phone` (with UY country code format), `whatsappConsent`
- [ ] Validate phone with Zod regex `/^\+598\d{8}$/`
- [ ] Save and mark profile complete

## 3.7 — Profile Edit

- [ ] `/dashboard/profile` — edit name, phone, avatar (Firebase Storage upload)
- [ ] Delete-account flow with confirmation modal (soft-delete: set `deletedAt`)

## 3.8 — Auth API Routes

- [ ] `POST /api/auth/session` — sets HTTP-only cookie from ID token
- [ ] `POST /api/auth/signout` — clears cookie
- [ ] `GET /api/auth/me` — returns current user + role

## 3.9 — Tests

- [ ] Unit: Zod validators for phone/name
- [ ] Integration: sign-in flow with emulator
- [ ] E2E: login → onboarding → dashboard (Playwright)

## Exit Criteria

- [ ] Google SSO works in dev and against emulator
- [ ] Session cookie persists across reloads
- [ ] Protected routes redirect correctly
- [ ] Admin role works; can be granted via API
- [ ] Profile onboarding enforced for new users
- [ ] No PII logged
