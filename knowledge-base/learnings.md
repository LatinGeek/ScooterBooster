# Alan's Learning Log

> This is Alan's long-term memory. Every session should review this file at the start and append new learnings at the end.
> Format: date → topic → concise takeaway.

---

## 2026-04-17

- **Firebase lazy init required:** `getAuth()` and `getFirestore()` crash at build time if called at module scope (no API keys during SSR build). Use lazy getter functions (`getFirebaseAuth()`, `getFirebaseDb()`) that initialize on first call.
  - Affected files: `src/lib/firebase.ts`

- **TypeScript generic spread casting:** `{ id, ...data } as T` fails. Must cast through `unknown` first: `{ id, ...data } as unknown as T`.
  - Affected files: `src/hooks/use-firestore.ts`

- **npm package naming:** `npm init` rejects uppercase names. If the project folder has capitals (e.g. `ScooterBooster`), init in a temp subfolder and move files.

- **Next.js 16 overwrites CLAUDE.md:** `create-next-app` generates its own `CLAUDE.md` with `@AGENTS.md`. Will overwrite any existing content. Back up before scaffolding.

- **Next.js 16 default SVGs:** Scaffolding creates `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` in `public/`. Remove if unused — they clutter the project.

- **next/font/google fails in no-internet build environments:** Build sandbox (and CI without internet) can't reach fonts.googleapis.com. Use `@fontsource-variable/inter` (npm package) instead and import in layout.tsx. No `next/font` wrapper needed.
  - Affected files: `src/app/layout.tsx`

- **noUncheckedIndexedAccess breaks getApps()[0]:** TypeScript strict flag makes array access return `T | undefined`. Fix: use nullish coalescing — `getApps()[0] ?? initializeApp(config)` instead of ternary with `getApps()[0]`.
  - Affected files: `src/lib/firebase.ts`

- **FIREBASE_ADMIN_PRIVATE_KEY must be quoted in .env.local:** The private key contains literal `\n` sequences. Without double quotes around the value, the key is read as a single line and Firebase Admin SDK throws a PEM parsing error at runtime.
  - Fix: `FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`

- **pino belongs in dependencies, not devDependencies:** Logger is used in API routes at runtime (server-side). Moving it to devDeps would break production builds.
  - Affected files: `package.json`

---

## 2026-04-18

- **Next.js 16 renames middleware.ts → proxy.ts:** The file is `src/proxy.ts` and the exported function must be named `proxy()` (not `middleware()`). Third-party docs still say "middleware" — they mean the same thing. Config export still works as before.
  - Affected files: `src/proxy.ts`

- **useSearchParams() requires Suspense wrapper at build time:** Any client component using `useSearchParams()` that isn't inside `<Suspense>` will fail during static prerendering with "missing-suspense-with-csr-bailout". Wrap the component that calls useSearchParams in its own inner component, then wrap with `<Suspense fallback={...}>` in the page export.
  - Affected files: `src/app/(auth)/login/page.tsx`

- **ISR (export const revalidate) fails in no-internet build sandbox:** During `next build`, Next.js tries to prerender pages with revalidate — this runs the page's data fetching code which calls Firestore. Without internet, Firestore DNS fails. Use `export const dynamic = "force-dynamic"` during development. Re-enable ISR after deploying to Vercel (which has internet).
  - Affected files: all pages in `src/app/(main)/` that query Firestore

- **withErrorHandling() must accept variadic args:** The original signature `handler: () => Promise<...>` rejects handlers that take `(req: NextRequest)`. Fixed to use generics: `handler: (...args: Args) => Promise<...>`.
  - Affected files: `src/lib/api-response.ts`

- **Zod v4 uses `.issues` not `.errors`:** `ZodError.errors` was renamed to `ZodError.issues` in Zod v4. Accessing `.errors` throws a TypeScript error. Use `parsed.error.issues[0]?.message`.
  - Affected files: `src/app/api/users/me/route.ts`

- **.next/.fuse_hidden files block rebuild:** macOS FUSE filesystem creates hidden lock files in `.next/` that can't be deleted from the sandbox (`EPERM`). Fix: use `mcp__cowork__allow_cowork_file_delete` to enable deletion, then `rm -f .next/.fuse_hidden*` before rebuilding.

- **Seed script uses deterministic IDs:** Seed doc IDs like `"brand-xiaomi"`, `"speed-limit"` make the seed idempotent (safe to re-run). Services are referenced by these deterministic IDs in scooterModels.compatibleServices and technicians.services/pricing.

- **(main)/layout.tsx was missing:** The `(main)` route group had no layout, so the Navbar was never rendered on main pages. Created `src/app/(main)/layout.tsx` importing and rendering `<Navbar />`.

- **FUSE lock files follow distDir:** Setting `distDir: "/tmp/sb-build"` in next.config.ts doesn't avoid FUSE `.fuse_hidden*` files — they appear in the new distDir too. Build still succeeds (all pages compiled, TypeScript clean); the EPERM is only on final cleanup. Safe to ignore in sandbox; revert distDir before Vercel deploy.
  - Affected files: `next.config.ts`

- **BookingStatus union expanded:** Changed from flat `"cancelled"` to `"cancelled_by_user" | "cancelled_by_technician" | "expired"`. More precise for technician dashboard UX and audit trails. All downstream code updated.
  - Affected files: `src/types/index.ts`, `src/lib/db/bookings.ts`, `src/app/api/bookings/[id]/route.ts`

- **AppError subclass constructors:** `NotFoundError` and `ValidationError` original constructors accepted English messages but hardcoded Spanish userMessage. Fixed to accept Spanish user-facing message as constructor arg — makes API error messages caller-controlled.
  - Affected files: `src/lib/errors.ts`

- **Booking wizard URL state persistence:** Use `useSearchParams()` + `router.replace()` to sync wizard step and selections to URL. This lets users refresh without losing progress. The wizard client must be wrapped in `<Suspense>` (useSearchParams rule).
  - Affected files: `src/app/(main)/booking/new/booking-wizard.tsx`

- **`.git/index.lock` left by automated sessions:** If a previous automated session was interrupted mid-git-operation, it leaves a `.git/index.lock` file that the sandbox FUSE filesystem won't let another process delete (EPERM). Fix: Germán must delete it manually from his terminal or Finder — `rm ScooterBooster/.git/index.lock`. Cannot be deleted from within the sandbox.

- **Review type needs technicianReply fields:** The `Review` interface was missing `technicianReply: string | null` and `technicianRepliedAt: string | null`. Added in Phase 12 to support technician replies from dashboard.
  - Affected files: `src/types/index.ts`, `src/lib/db/reviews.ts`

- **WhatsApp links need user phone, not UID:** In technician bookings dashboard, `booking.userId` is a Firebase Auth UID (not a phone number). For proper wa.me links, fetch user's phone from Firestore `users/{uid}.phone`. This is a Phase 14 task.

- **next.config.ts distDir must be reverted before Vercel deploy:** The sandbox workaround `distDir: "/tmp/sb-build"` causes build output to go to /tmp. Vercel deploy reads from default `.next/`. Remove `distDir` line before deploying.
  - Affected files: `next.config.ts`

- **Firestore config/global for platform settings:** Admin-configurable platform settings (service fee %) stored in `config/global` Firestore doc. Read via `GET /api/admin/settings`. The `mercadopago.ts` currently still reads from env var — wire to Firestore config before launch.
  - Affected files: `src/lib/mercadopago.ts`, `src/app/api/admin/settings/route.ts`

## 2026-04-19

- **`next.config.mjs` overrides `next.config.ts` on Vercel:** Next.js resolves config files in order — `.mjs` takes precedence over `.ts`. A stale `next.config.mjs` with `distDir: "/tmp/sb-fresh-*"` caused `routes-manifest.json not found` on Vercel (build output went to /tmp, not .next/). Always delete `next.config.mjs` artifacts before deploying.
  - Fix: `rm next.config.mjs next.config.ts.bak` before `vercel --prod`

- **Vercel prod URL:** https://scooter-booster.vercel.app (alias). Latest deploy: `scooter-booster-pqqqlt21r-latingeeks-projects.vercel.app`

- **Next.js 16 page `searchParams` are promises:** Server pages should `await searchParams` instead of treating them as synchronous objects. That keeps new App Router pages aligned with request-time APIs and avoids future deprecation cleanup.
  - Affected files: `src/app/(main)/technicians/page.tsx`, `src/app/(main)/search/page.tsx`

- **Next.js 16 `next build` mutates `tsconfig.json` with temp type paths:** The build injects `/tmp/sb-fresh-*/types/**/*.ts` entries into `include`. They are only build-time noise in this workspace and should be removed before committing.
  - Affected files: `tsconfig.json`

- **Search tokens should be refreshed on write paths, not only in search code:** Search/discovery now prefers indexed `searchTokens` and `normalizedLocation` fields when present, but those fields need to be maintained anywhere data is seeded or technician profiles are updated. Current implementation covers `scripts/seed.ts` and `updateTechnicianProfile()` so discovery stays in sync with profile edits.
  - Affected files: `scripts/seed.ts`, `src/lib/search.ts`, `src/lib/db/technicians.ts`, `src/lib/db/brands.ts`, `src/lib/db/models.ts`, `src/lib/db/services.ts`

- **`Intl.NumberFormat("es-UY")` uses a non-breaking space after the currency symbol:** Unit tests for `formatPrice()` should normalize `\u00A0` before comparing exact strings, otherwise locale-correct output can fail brittle assertions.
  - Affected files: `src/lib/utils.ts`, `src/lib/utils.test.ts`

- **Booking rules are safer when extracted from route handlers:** Disclaimer enforcement and role-based booking status transitions were previously embedded inside route/UI code. Moving them into `src/lib/booking-rules.ts` makes the API route and booking wizard share the same decisions and gives Vitest a stable unit-test target.
  - Affected files: `src/lib/booking-rules.ts`, `src/app/api/bookings/route.ts`, `src/app/api/bookings/[id]/route.ts`, `src/app/(main)/booking/new/booking-wizard.tsx`

- **Next route handlers are straightforward to unit test with direct imports plus mocked deps:** For App Router API coverage, importing the route module directly and mocking session/Firestore/payment modules with Vitest gives fast handler-level tests without spinning up Next dev server or Firebase emulators.
  - Affected files: `src/app/api/bookings/route.test.ts`, `src/app/api/bookings/[id]/route.test.ts`

- **Authenticated self-service API routes are good early handler-test targets:** Routes like `/api/technicians/me` are compact but high-value because they combine auth, role gating, validation, and mutation in one place. They give strong regression protection with minimal mock surface area.
  - Affected files: `src/app/api/technicians/me/route.test.ts`

- **Missing Firestore composite indexes can make completed pages fail only at runtime:** The catalog and discovery pages built cleanly and passed unit tests, but production smoke testing exposed `FAILED_PRECONDITION` errors from Firestore for active+sorted queries. The fix belongs in repo config (`firestore.indexes.json`), not in the page code itself.
  - Affected files: `firestore.indexes.json`, `src/lib/db/brands.ts`, `src/lib/db/models.ts`, `src/lib/db/services.ts`, `src/lib/db/technicians.ts`, `src/lib/db/reviews.ts`, `src/lib/db/bookings.ts`

- **Playwright can cover route health before full seeded E2E fixtures exist:** The first stable browser checks here are protected-route redirects and public-page smoke assertions that ensure pages render without the Next.js server-error fallback. That gives runtime regression coverage while fixture/seeding strategy for full booking flows is still being defined.
  - Affected files: `playwright.config.ts`, `tests/e2e/auth-redirect.spec.ts`, `tests/e2e/public-routes.spec.ts`
