# Alan's Learning Log

> This is Alan's long-term memory. Every session should review this file at the start and append new learnings at the end.
> Format: date â†’ topic â†’ concise takeaway.

---

## 2026-04-17

- **Firebase lazy init required:** `getAuth()` and `getFirestore()` crash at build time if called at module scope (no API keys during SSR build). Use lazy getter functions (`getFirebaseAuth()`, `getFirebaseDb()`) that initialize on first call.
  - Affected files: `src/lib/firebase.ts`

- **TypeScript generic spread casting:** `{ id, ...data } as T` fails. Must cast through `unknown` first: `{ id, ...data } as unknown as T`.
  - Affected files: `src/hooks/use-firestore.ts`

- **npm package naming:** `npm init` rejects uppercase names. If the project folder has capitals (e.g. `ScooterBooster`), init in a temp subfolder and move files.

- **Next.js 16 overwrites CLAUDE.md:** `create-next-app` generates its own `CLAUDE.md` with `@AGENTS.md`. Will overwrite any existing content. Back up before scaffolding.

- **Next.js 16 default SVGs:** Scaffolding creates `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` in `public/`. Remove if unused â€” they clutter the project.

- **next/font/google fails in no-internet build environments:** Build sandbox (and CI without internet) can't reach fonts.googleapis.com. Use `@fontsource-variable/inter` (npm package) instead and import in layout.tsx. No `next/font` wrapper needed.
  - Affected files: `src/app/layout.tsx`

- **noUncheckedIndexedAccess breaks getApps()[0]:** TypeScript strict flag makes array access return `T | undefined`. Fix: use nullish coalescing â€” `getApps()[0] ?? initializeApp(config)` instead of ternary with `getApps()[0]`.
  - Affected files: `src/lib/firebase.ts`

- **FIREBASE_ADMIN_PRIVATE_KEY must be quoted in .env.local:** The private key contains literal `\n` sequences. Without double quotes around the value, the key is read as a single line and Firebase Admin SDK throws a PEM parsing error at runtime.
  - Fix: `FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`

- **pino belongs in dependencies, not devDependencies:** Logger is used in API routes at runtime (server-side). Moving it to devDeps would break production builds.
  - Affected files: `package.json`

---

## 2026-04-18

- **Next.js 16 renames middleware.ts â†’ proxy.ts:** The file is `src/proxy.ts` and the exported function must be named `proxy()` (not `middleware()`). Third-party docs still say "middleware" â€” they mean the same thing. Config export still works as before.
  - Affected files: `src/proxy.ts`

- **useSearchParams() requires Suspense wrapper at build time:** Any client component using `useSearchParams()` that isn't inside `<Suspense>` will fail during static prerendering with "missing-suspense-with-csr-bailout". Wrap the component that calls useSearchParams in its own inner component, then wrap with `<Suspense fallback={...}>` in the page export.
  - Affected files: `src/app/(auth)/login/page.tsx`

- **ISR (export const revalidate) fails in no-internet build sandbox:** During `next build`, Next.js tries to prerender pages with revalidate â€” this runs the page's data fetching code which calls Firestore. Without internet, Firestore DNS fails. Use `export const dynamic = "force-dynamic"` during development. Re-enable ISR after deploying to Vercel (which has internet).
  - Affected files: all pages in `src/app/(main)/` that query Firestore

- **withErrorHandling() must accept variadic args:** The original signature `handler: () => Promise<...>` rejects handlers that take `(req: NextRequest)`. Fixed to use generics: `handler: (...args: Args) => Promise<...>`.
  - Affected files: `src/lib/api-response.ts`

- **Zod v4 uses `.issues` not `.errors`:** `ZodError.errors` was renamed to `ZodError.issues` in Zod v4. Accessing `.errors` throws a TypeScript error. Use `parsed.error.issues[0]?.message`.
  - Affected files: `src/app/api/users/me/route.ts`

- **.next/.fuse_hidden files block rebuild:** macOS FUSE filesystem creates hidden lock files in `.next/` that can't be deleted from the sandbox (`EPERM`). Fix: use `mcp__cowork__allow_cowork_file_delete` to enable deletion, then `rm -f .next/.fuse_hidden*` before rebuilding.

- **Seed script uses deterministic IDs:** Seed doc IDs like `"brand-xiaomi"`, `"speed-limit"` make the seed idempotent (safe to re-run). Services are referenced by these deterministic IDs in scooterModels.compatibleServices and technicians.services/pricing.

- **(main)/layout.tsx was missing:** The `(main)` route group had no layout, so the Navbar was never rendered on main pages. Created `src/app/(main)/layout.tsx` importing and rendering `<Navbar />`.

- **FUSE lock files follow distDir:** Setting `distDir: "/tmp/sb-build"` in next.config.ts doesn't avoid FUSE `.fuse_hidden*` files â€” they appear in the new distDir too. Build still succeeds (all pages compiled, TypeScript clean); the EPERM is only on final cleanup. Safe to ignore in sandbox; revert distDir before Vercel deploy.
  - Affected files: `next.config.ts`

- **BookingStatus union expanded:** Changed from flat `"cancelled"` to `"cancelled_by_user" | "cancelled_by_technician" | "expired"`. More precise for technician dashboard UX and audit trails. All downstream code updated.
  - Affected files: `src/types/index.ts`, `src/lib/db/bookings.ts`, `src/app/api/bookings/[id]/route.ts`

- **AppError subclass constructors:** `NotFoundError` and `ValidationError` original constructors accepted English messages but hardcoded Spanish userMessage. Fixed to accept Spanish user-facing message as constructor arg â€” makes API error messages caller-controlled.
  - Affected files: `src/lib/errors.ts`

- **Booking wizard URL state persistence:** Use `useSearchParams()` + `router.replace()` to sync wizard step and selections to URL. This lets users refresh without losing progress. The wizard client must be wrapped in `<Suspense>` (useSearchParams rule).
  - Affected files: `src/app/(main)/booking/new/booking-wizard.tsx`

- **`.git/index.lock` left by automated sessions:** If a previous automated session was interrupted mid-git-operation, it leaves a `.git/index.lock` file that the sandbox FUSE filesystem won't let another process delete (EPERM). Fix: GermÃ¡n must delete it manually from his terminal or Finder â€” `rm ScooterBooster/.git/index.lock`. Cannot be deleted from within the sandbox.

- **Review type needs technicianReply fields:** The `Review` interface was missing `technicianReply: string | null` and `technicianRepliedAt: string | null`. Added in Phase 12 to support technician replies from dashboard.
  - Affected files: `src/types/index.ts`, `src/lib/db/reviews.ts`

- **WhatsApp links need user phone, not UID:** In technician bookings dashboard, `booking.userId` is a Firebase Auth UID (not a phone number). For proper wa.me links, fetch user's phone from Firestore `users/{uid}.phone`. This is a Phase 14 task.

- **next.config.ts distDir must be reverted before Vercel deploy:** The sandbox workaround `distDir: "/tmp/sb-build"` causes build output to go to /tmp. Vercel deploy reads from default `.next/`. Remove `distDir` line before deploying.
  - Affected files: `next.config.ts`

- **Firestore config/global for platform settings:** Admin-configurable platform settings (service fee %) stored in `config/global` Firestore doc. Read via `GET /api/admin/settings`. The `mercadopago.ts` currently still reads from env var â€” wire to Firestore config before launch.
  - Affected files: `src/lib/mercadopago.ts`, `src/app/api/admin/settings/route.ts`

## 2026-04-19

- **`next.config.mjs` overrides `next.config.ts` on Vercel:** Next.js resolves config files in order â€” `.mjs` takes precedence over `.ts`. A stale `next.config.mjs` with `distDir: "/tmp/sb-fresh-*"` caused `routes-manifest.json not found` on Vercel (build output went to /tmp, not .next/). Always delete `next.config.mjs` artifacts before deploying.
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

- **Mocked route tests scale well for auth-heavy handlers:** `users/me` and `reviews` followed the same direct-import Vitest pattern as bookings/technicians. Mocking only session, DAL, and logger dependencies keeps route coverage fast while still exercising real validation and error handling branches.
  - Affected files: `src/app/api/users/me/route.test.ts`, `src/app/api/reviews/route.test.ts`

- **Admin-facing validation still needs explicit Spanish messages:** Zod's default messages are English, so admin routes should provide localized validation text explicitly instead of surfacing raw parser output. We fixed this for technician approval actions and platform settings updates while adding handler tests.
  - Affected files: `src/app/api/admin/technicians/[id]/route.ts`, `src/app/api/admin/settings/route.ts`

- **Cookie-based auth routes are easy to regression-test with a mocked `next/headers` store:** For `auth/session` and `auth/signout`, mocking the cookie store directly lets us verify httpOnly/session-role cookie behavior without spinning up middleware or a browser.
  - Affected files: `src/app/api/auth/session/route.test.ts`, `src/app/api/auth/signout/route.test.ts`

- **Webhook signature checks should reject mismatched digest lengths before `timingSafeEqual`:** The MercadoPago webhook handler was throwing a `RangeError` on malformed `v1` digests instead of returning `401`. A quick length guard keeps the verification path safe and lets tests exercise invalid signatures deterministically.
  - Affected files: `src/app/api/payments/webhook/route.ts`, `src/app/api/payments/webhook/route.test.ts`

- **Search/filter route tests are a good place to enforce Spanish validation text:** Query-string validation comes from Zod too, so public API routes need explicit localized messages if we want consistent UX outside forms. Adding handler tests for `/api/search` and `/api/technicians` caught lingering English defaults right away.
  - Affected files: `src/app/api/search/route.ts`, `src/app/api/search/route.test.ts`, `src/app/api/technicians/route.ts`, `src/app/api/technicians/route.test.ts`

- **Firestore rules testing still depends on the Java-backed emulator:** Adding `@firebase/rules-unit-testing` plus `firebase emulators:exec` gets the repo ready for rules coverage, but the suite will fail before boot if `java` is missing from `PATH`. Treat that as an environment prerequisite, not an app-code failure.
  - Affected files: `firestore.rules`, `tests/firestore.rules.test.ts`, `package.json`, `firebase.json`

- **Seed data is a prerequisite for meaningful public-flow E2E checks:** The booking wizard rendered correctly but had no selectable scooter models until the deterministic seed script was re-run. Public booking/disclaimer browser tests are reliable once `npm run seed` has repopulated the dev Firestore dataset.
  - Affected files: `scripts/seed.ts`, `tests/e2e/booking-disclaimer.spec.ts`

- **Responsive smoke tests catch layout regressions without needing full auth fixtures:** A small Playwright slice at 375px portrait and landscape-mobile widths gives useful QA coverage for public flows while deeper authenticated scenarios still depend on test-session plumbing.
  - Affected files: `tests/e2e/responsive-public-routes.spec.ts`

- **Firebase custom tokens are the cleanest bridge into authenticated Playwright coverage here:** Exchanging an Admin SDK custom token for an ID token and posting it to `/api/auth/session` gives us real session cookies for browser tests without automating the Google popup flow. That unlocks stable dashboard E2E coverage for user, technician, and admin roles.
  - Affected files: `tests/e2e/support/auth.ts`, `tests/e2e/authenticated-dashboards.spec.ts`

- **Client-side Firebase auth must be present for mutation-heavy E2E flows, not just server session cookies:** SSR dashboard pages were satisfied by server sessions, but the booking wizard still failed because `AuthProvider` clears the server cookie when browser Firebase auth is empty. A test-only custom-token helper exposed from `AuthProvider`, compiled through `npm run start:e2e`, keeps both layers in sync for authenticated browser tests.
  - Affected files: `src/providers/auth-provider.tsx`, `tests/e2e/support/auth.ts`, `tests/e2e/booking-flow.spec.ts`, `playwright.config.ts`, `package.json`

- **Server-to-client props must strip Firestore `Timestamp` instances before interactive pages hydrate:** The technician bookings page passed raw service/model docs into a Client Component, which only broke once Playwright reached that route in production mode. Converting `createdAt` to ISO strings in the Server Component fixed the Next 16 serialization failure.
  - Affected files: `src/app/dashboard/technician/bookings/page.tsx`

- **Direct Firestore fixture seeding keeps workflow E2E coverage deterministic:** Admin moderation and technician booking-transition flows were easiest to test by inserting their prerequisite docs through Firebase Admin from Playwright support helpers, instead of depending on long UI setup chains. That pattern now powers seeded pending-tech and booking fixtures for the new E2E specs.
  - Affected files: `tests/e2e/support/fixtures.ts`, `tests/e2e/admin-technician-approval.spec.ts`, `tests/e2e/technician-booking-management.spec.ts`


- **Vercel Analytics packages should only mount on real Vercel deployments in this repo:** Rendering `@vercel/analytics/next` and `@vercel/speed-insights/next` unconditionally caused local production Playwright runs to fetch missing `/_vercel/*` scripts and emit console errors. Guarding them behind `process.env.VERCEL === "1"` keeps local QA clean while preserving production instrumentation.
  - Affected files: `src/app/layout.tsx`

- **`withErrorHandling()` is a good central seam for API request telemetry:** Adding route/method/status/duration logging in `src/lib/api-response.ts` gave observability coverage to request-based handlers without touching every route file. Logger calls need to tolerate partially mocked logger objects in Vitest, so the wrapper now checks whether each log method exists before calling it.
  - Affected files: `src/lib/api-response.ts`

- **A lightweight `/api/health` endpoint can piggyback on an existing Firestore doc:** Checking `config/global` is enough to verify Firestore connectivity without inventing a dedicated collection. That gives uptime monitors a stable health probe while keeping the route simple to unit test.
  - Affected files: `src/app/api/health/route.ts`, `src/app/api/health/route.test.ts`

- **Playwright's `webServer.env` does not automatically inherit `.env.local` unless the config loads it first:** The booking flow kept falling back to the internal detail page because the spawned Next server never received the MercadoPago credentials. Loading `.env.local` inside `playwright.config.ts` fixed the handoff and let the browser reach real MercadoPago checkout.
  - Affected files: `playwright.config.ts`, `tests/e2e/booking-flow.spec.ts`

- **Local MercadoPago E2E can reach hosted checkout, but full payment confirmation still needs a public callback target:** Using the app's production URL for `back_urls` and webhook endpoints lets local tests create preferences and hand off into MercadoPago, but the final success/webhook confirmation path cannot be verified purely against `127.0.0.1`. That last step needs a publicly reachable preview or prod deployment plus sandbox buyer credentials/cards.
  - Affected files: `src/lib/mercadopago.ts`, `tests/e2e/booking-flow.spec.ts`

- **Sentry's modern Next.js setup for App Router spans multiple files, not just `next.config.ts`:** The current manual integration needs `src/instrumentation.ts`, `src/instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and `src/app/global-error.tsx`, with `withSentryConfig()` wrapping `next.config.ts`. Without exporting `onRouterTransitionStart` from `instrumentation-client`, the SDK warns that navigation tracing is incomplete.
  - Affected files: `src/instrumentation.ts`, `src/instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/app/global-error.tsx`, `next.config.ts`

- **Trusted-origin checks are an easy CSRF baseline for App Router mutations:** A small helper in `src/lib/security.ts` can reject missing or mismatched `Origin` headers before auth/body parsing, and allowing localhost origins outside production keeps Playwright and local browser flows working without weakening deployed routes. Server-to-server webhooks still need signature verification instead of browser-origin checks.
  - Affected files: `src/lib/security.ts`, `src/app/api/auth/session/route.ts`, `src/app/api/auth/signout/route.ts`, `src/app/api/bookings/route.ts`, `src/app/api/bookings/[id]/route.ts`, `src/app/api/payments/initiate/route.ts`, `src/app/api/reviews/route.ts`, `src/app/api/reviews/[id]/route.ts`, `src/app/api/technicians/me/route.ts`, `src/app/api/users/me/route.ts`, `src/app/api/admin/set-role/route.ts`, `src/app/api/admin/settings/route.ts`, `src/app/api/admin/technicians/[id]/route.ts`, `knowledge-base/integrations/security.md`

- **Dependabot plus a tiny audit workflow covers the low-friction dependency hygiene loop:** This repo only needed `.github/dependabot.yml` for npm/GitHub Actions and a weekly `npm audit --omit=dev` workflow to satisfy the Phase 19 dependency-audit requirement once the local audit was already clean.
  - Affected files: `.github/dependabot.yml`, `.github/workflows/security-audit.yml`, `build-plan-tracker/19-security.md`

- **A local-memory fallback keeps Upstash-style rate limiting testable before infra is wired:** `@upstash/ratelimit` + `@upstash/redis` can back the real production limits, but a tiny process-local windowed fallback lets route tests and local development keep exercising the same guardrails before Redis credentials exist. Keep that limitation documented so nobody mistakes local fallback behavior for true distributed enforcement.
  - Affected files: `src/lib/ratelimit.ts`, `src/lib/ratelimit.test.ts`, `src/app/api/auth/session/route.ts`, `src/app/api/auth/signout/route.ts`, `src/app/api/bookings/route.ts`, `src/app/api/payments/initiate/route.ts`, `src/app/api/reviews/route.ts`, `knowledge-base/integrations/security.md`

- **Sanitize before validating when a field should stay plain text:** For bios, review comments, and technician replies, stripping tags first with `isomorphic-dompurify` keeps the stored value safe and lets the existing Zod length rules run against the cleaned text instead of the attacker-controlled HTML shell.
  - Affected files: `src/lib/sanitize.ts`, `src/lib/sanitize.test.ts`, `src/app/api/reviews/route.ts`, `src/app/api/reviews/[id]/route.ts`, `src/app/api/technicians/me/route.ts`

- **Privacy export endpoints can stay small if they only return user-owned records:** For this repo, `GET /api/users/me/export` is useful even before the full deletion workflow exists because it bundles the signed-in user's profile, bookings, reviews, and optional technician profile without exposing unrelated users' data.
  - Affected files: `src/app/api/users/me/export/route.ts`, `src/app/api/users/me/export/route.test.ts`, `knowledge-base/integrations/security.md`

- **Next.js 16 `revalidateTag` requires two arguments:** The signature is `revalidateTag(tag: string, profile: string | { expire?: number }): void`. Single-arg form errors at TypeScript build time. Use `{ expire: 0 }` for immediate purge from admin/mutation routes.
  - Affected files: `src/app/api/admin/technicians/[id]/route.ts`

- **`import dynamic` collides with `export const dynamic` route segment config:** Naming the next/dynamic import `dynamic` causes "defined multiple times" TypeScript error when the same file also exports `export const dynamic = "force-dynamic"`. Fix: alias the import — `import lazyLoad from "next/dynamic"`.
  - Affected files: all 6 dashboard + admin pages with lazy-loaded client components

- **Vercel Cron jobs are configured in `vercel.json`:** Add a `"crons"` array with `path` and `schedule` (cron syntax). Vercel calls the path via POST with `Authorization: Bearer CRON_SECRET`. Check `CRON_SECRET` env var in the route handler to distinguish cron from manual admin calls.
  - Affected files: `vercel.json`, `src/app/api/admin/users/purge-deleted/route.ts`

- **Sonner v2 `classNames` API for per-type styling:** Pass `toastOptions.classNames` to the `<Toaster>` component to apply Tailwind classes by toast type (`success`, `error`, etc.). The `classNames` prop moved from top-level to nested under `toastOptions` in v2.
  - Affected files: `src/app/layout.tsx`

- **CSP `frame-ancestors 'none'` supersedes `X-Frame-Options: DENY` for modern browsers** — set both for maximum compatibility. `upgrade-insecure-requests` should be in the CSP, not as a separate header. Next.js App Router hydration requires `unsafe-inline` on `script-src` until nonce infrastructure is added.
  - Affected files: `next.config.ts`

- **Vitest rules config must not merge the main exclude list if the rules suite lives under `tests/`:** Merging the default config kept `tests/firestore.rules.test.ts` excluded, so the emulator command silently ran the regular unit suite instead of the Firestore rules checks. The dedicated `vitest.rules.config.ts` now stands alone and only includes the emulator-only rules file.
  - Affected files: `vitest.rules.config.ts`, `tests/firestore.rules.test.ts`

- **`next/font/google` is the cleanest way to close the Phase 20 font-loading checklist in Next.js 16:** Swapping the root `@fontsource-variable/inter` import for `Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" })` trims the manual package dependency, keeps preload behavior aligned with the framework, and still feeds Tailwind's `--font-sans` token cleanly through the app shell.
  - Affected files: `src/app/layout.tsx`, `src/app/globals.css`, `package.json`

- **Local production Lighthouse is stable enough to gate public-route polish work here:** Running `next build` + `next start` locally and auditing the public pages with headless Chrome gave repeatable mobile scores above the Phase 20 targets without needing a deployed preview. Capturing the route-by-route scores directly in the tracker makes the remaining gap obvious: authenticated dashboard and desktop audits still need a session-aware harness.
  - Affected files: `build-plan-tracker/20-performance.md`, `build-plan-tracker/README.md`

- **Loopback production-mode auth needs request-aware cookie security, not a raw `NODE_ENV` check:** In local Playwright runs we still boot Next with `NODE_ENV=production`, but the browser talks to `http://127.0.0.1`. Tying `secure` cookies to `req.nextUrl.protocol === "https:"`, while also relaxing origin/rate-limit checks for loopback hosts only, restores realistic E2E coverage without weakening deployed traffic.
  - Affected files: `src/app/api/auth/session/route.ts`, `src/app/api/auth/signout/route.ts`, `src/lib/security.ts`, `src/lib/security.test.ts`, `src/lib/ratelimit.ts`, `src/lib/ratelimit.test.ts`, `playwright.config.ts`

- **Asset-backed seed catalogs make public QA far more trustworthy than placeholder text-only models:** Pointing seeded scooter models at real files under `public/assets/scooter-model-images` exposed the need to surface `imageURL` consistently in the catalog, booking wizard, and scooter detail pages. Once the seed script and UI both used the same image-backed records, the catalog became much easier to validate visually.
  - Affected files: `scripts/seed.ts`, `src/components/scooter-card.tsx`, `src/app/(main)/booking/new/booking-wizard.tsx`, `src/app/(main)/scooters/[id]/page.tsx`, `build-plan-tracker/05-scooter-catalog.md`

- **Technician onboarding got much simpler once we reused the existing technician document shape instead of inventing a second application model:** A pending application can live in the same `technicians` collection with `isApproved: false` and `isActive: true`, which means the public listing naturally excludes it while admin moderation and future profile editing keep working on the same record.
  - Affected files: `src/app/(main)/technicians/apply/page.tsx`, `src/app/(main)/technicians/apply/apply-form.tsx`, `src/app/api/technicians/apply/route.ts`, `src/lib/db/technicians.ts`

- **Cross-site checkout navigation is a bad source of truth for local Playwright reliability:** For dev-mode E2E, it is much more stable to capture the generated MercadoPago handoff URL behind an E2E-only branch than to depend on the browser successfully leaving the app during the assertion. We still keep the real provider integration in normal runtime paths, but tests now assert the handoff deterministically.
  - Affected files: `src/app/(main)/booking/new/booking-wizard.tsx`, `src/lib/mercadopago.ts`, `src/app/api/bookings/route.ts`, `playwright.config.ts`, `tests/e2e/booking-flow.spec.ts`

- **Local Playwright is more reliable in this repo with one worker than with fully parallel browser workers:** Several authenticated flows share the same Firebase-backed bootstrap assumptions, so running the suite serially in dev mode removes flaky sign-in and moderation collisions without affecting CI retry behavior.
  - Affected files: `playwright.config.ts`

- **Technician profile management is easier to QA when the form owns a live public preview:** A dedicated `/dashboard/technician/profile` page that edits bio, location, contact details, active status, and photo URL/upload in one place closes a real product gap and gives Playwright a stable end-to-end target for technician-facing profile changes.
  - Affected files: `src/app/dashboard/technician/profile/page.tsx`, `src/app/dashboard/technician/profile/profile-client.tsx`, `src/app/api/technicians/me/route.ts`, `src/lib/db/technicians.ts`, `tests/e2e/technician-profile.spec.ts`
- **User notifications fit this repo well as a Firestore subcollection plus client subscriptions:** Storing lightweight notification docs under `users/{uid}/notifications/{id}` makes unread badges and a real-time notification center straightforward, while route handlers can fan out new notifications with Admin SDK writes after the response using `after()`.
  - Affected files: `src/lib/db/notifications.ts`, `src/lib/notifications.ts`, `src/components/notification-bell.tsx`, `src/app/dashboard/notifications/page.tsx`, `src/app/dashboard/notifications/notifications-client.tsx`, `firestore.rules`

- **`after()` is great in real route handlers but needs explicit mocking in Vitest:** Route-unit tests do not run inside a real Next request scope, so any handler that calls `after()` will throw unless the test suite mocks it from `next/server`. The safest test pattern here is to keep the real `NextRequest` export and stub only `after`.
  - Affected files: `src/app/api/bookings/route.test.ts`, `src/app/api/bookings/[id]/route.test.ts`

- **Uruguay-morning reminder cron timing belongs in UTC inside `vercel.json`:** A daily reminder job intended for `09:00` Montevideo should be scheduled at `12:00 UTC` in Vercel cron syntax, then the route can compute the "tomorrow" booking window and mark `reminderSentAt` on each booking to prevent duplicate sends.
  - Affected files: `vercel.json`, `src/app/api/cron/booking-reminders/route.ts`, `src/app/api/cron/booking-reminders/route.test.ts`, `src/lib/db/bookings.ts`

- **Audit visibility becomes much more useful once writes normalize around a shared `auditLog` shape:** Converting ad hoc action writes into `{ action, actorUid, targetType, targetId, metadata, createdAt }` makes it straightforward to power a single `/admin/audit` viewer that can filter technician moderation, booking lifecycle changes, disclaimer acceptance, reminder runs, and payment webhooks in one place.
  - Affected files: `src/lib/db/audit-log.ts`, `src/app/admin/audit/page.tsx`, `src/app/api/bookings/route.ts`, `src/app/api/bookings/[id]/route.ts`, `src/app/api/payments/webhook/route.ts`, `src/app/api/admin/technicians/[id]/route.ts`

- **Soft-hiding reviews preserves trust signals better than deleting them outright in an admin moderation flow:** Keeping the original review document and excluding `isHidden` records from public queries lets admins reverse a moderation call, maintains rating-history context, and gives the audit log enough metadata to explain why a comment disappeared from technician profiles.
  - Affected files: `src/lib/db/reviews.ts`, `src/app/api/admin/reviews/route.ts`, `src/app/admin/reviews/page.tsx`, `src/app/admin/reviews/reviews-client.tsx`, `build-plan-tracker/10-reviews.md`, `build-plan-tracker/13-admin-panel.md`

- **Admin refunds become much simpler once webhook reconciliation stores the MercadoPago payment id on the booking itself:** The booking record already sits at the center of support workflows, so persisting `paymentId` during webhook processing avoids a second lookup step later and lets `/admin/bookings` trigger exact refunds through `/api/payments/[id]/refund` without opening MercadoPago manually.
  - Affected files: `src/lib/db/bookings.ts`, `src/app/api/payments/webhook/route.ts`, `src/app/api/payments/[id]/refund/route.ts`, `src/app/admin/bookings/page.tsx`, `src/app/admin/bookings/bookings-client.tsx`, `build-plan-tracker/09-payments.md`, `build-plan-tracker/13-admin-panel.md`

- **Admin role changes should update both Firebase custom claims and the mirrored Firestore user doc in the same flow:** If the dashboard reads `users.role` but the auth layer reads custom claims, changing only one source leaves the panel visually stale and creates weird authorization drift. Syncing both, and audit-logging the change, keeps the admin UI and route guards aligned.
  - Affected files: `src/app/api/admin/set-role/route.ts`, `src/lib/db/users.ts`, `src/app/admin/users/page.tsx`, `src/app/admin/users/users-client.tsx`, `build-plan-tracker/13-admin-panel.md`

- **Admin suspension works best as a soft-delete plus Firebase Auth disable, not as an immediate hard delete:** Marking `deletedAt`/`scheduledDeletionAt`, disabling the auth user, and then letting the existing purge cron finish the 30-day grace period gives support a safe restore path while still taking the account offline instantly.
  - Affected files: `src/app/api/admin/users/route.ts`, `src/lib/db/users.ts`, `src/app/admin/users/users-client.tsx`, `src/app/api/admin/users/purge-deleted/route.ts`, `knowledge-base/learnings.md`

- **You do not need a chart library to make the admin overview genuinely useful in this repo:** For the current scale, a small server-side aggregation plus lightweight SVG polylines is enough to show 30-day bookings and GMV trends without adding bundle weight or a new dependency surface.
  - Affected files: `src/app/admin/page.tsx`, `src/app/admin/overview-charts.tsx`, `build-plan-tracker/13-admin-panel.md`

- **Admin technician moderation becomes much more useful once it also supports direct profile overrides:** Approval alone leaves support stuck when a technician profile is mostly right but needs a quick copy, contact, or compatibility fix. Reusing the same profile-update path behind an admin-scoped override action closes that gap without inventing a second technician-edit system.
  - Affected files: `src/app/admin/technicians/page.tsx`, `src/app/admin/technicians/technicians-client.tsx`, `src/app/api/admin/technicians/[id]/route.ts`, `build-plan-tracker/13-admin-panel.md`

- **Technician photo uploads are safer when the browser only sends raw files and the server owns resizing:** Moving profile-photo uploads behind `/api/technicians/me/photo` lets us validate MIME/size, generate consistent `512x512` + `128x128` WebP derivatives with `sharp`, and keep Firebase Storage URLs predictable for the public technician card and profile surfaces.
  - Affected files: `src/app/api/technicians/me/photo/route.ts`, `src/app/dashboard/technician/profile/profile-client.tsx`, `src/lib/firebase-admin.ts`, `build-plan-tracker/07-technicians.md`

- **A request-changes moderation state is more useful than a binary approve/reject flow for technician onboarding:** Persisting a dedicated application status plus moderation reason lets admins send actionable feedback, keeps the applicant inside the same technician record, and makes resubmission a small profile update instead of a fresh application from scratch.
  - Affected files: `src/lib/db/technicians.ts`, `src/app/api/admin/technicians/[id]/route.ts`, `src/app/api/technicians/apply/route.ts`, `src/app/(main)/technicians/apply/apply-form.tsx`, `src/app/admin/technicians/technicians-client.tsx`

- **Analytics consent is easier to evolve when the cookie banner stores structured preferences instead of a single accepted flag:** Migrating from `sb-cookie-consent=accepted` to a JSON payload under `sb-cookie-preferences` let us gate GA4 loading and custom events cleanly, while still preserving backward compatibility for browsers that had already accepted the old banner.
  - Affected files: `src/lib/analytics.ts`, `src/components/cookie-banner.tsx`, `src/components/analytics-provider.tsx`, `build-plan-tracker/16-seo-legal.md`, `build-plan-tracker/18-observability.md`

- **GA4 event plumbing can stay client-first in App Router as long as the return surfaces carry enough state:** Booking creation can emit `payment_initiated` before the MercadoPago handoff, and the booking detail page can emit `payment_succeeded`, `payment_failed`, and `booking_confirmed` once per session by reading the back-url status plus the live booking document.
  - Affected files: `src/app/layout.tsx`, `src/app/onboarding/page.tsx`, `src/app/(main)/booking/new/booking-wizard.tsx`, `src/app/(main)/booking/[id]/booking-detail-client.tsx`, `src/components/review-form.tsx`, `src/app/(main)/technicians/apply/apply-form.tsx`, `src/app/admin/technicians/technicians-client.tsx`

- **Service detail pages become much more decision-friendly when educational content lives beside the booking CTA:** Adding service-specific sections for what is included, when to choose the service, how to prepare before booking, and short FAQs closes the “what does this actually mean for me?” gap without needing a CMS or extra Firestore schema.
  - Affected files: `src/app/(main)/services/[slug]/page.tsx`, `build-plan-tracker/06-services.md`

- **Search feels much more complete once every empty state offers a recovery path instead of just saying “no results”:** On this project, the useful pattern was to keep the full query in the URL, show removable filter chips on `/technicians`, and offer one-click follow-up actions like “Quitar búsqueda”, “Quitar servicios”, or “Buscar técnicos” so discovery never becomes a dead end.
  - Affected files: `src/app/(main)/search/page.tsx`, `src/app/(main)/technicians/page.tsx`, `tests/e2e/public-routes.spec.ts`, `build-plan-tracker/15-search.md`

- **Desktop-authenticated QA gets much more trustworthy once it checks the post-login navbar state, not just protected routes:** Verifying that signed-in users see `Mi panel` while guest CTAs disappear catches session-hydration regressions early, and then a small set of admin/user/technician destination checks gives us broad desktop confidence without building a brittle mega-spec.
  - Affected files: `tests/e2e/desktop-authenticated-navigation.spec.ts`, `tests/e2e/support/auth.ts`, `build-plan-tracker/17-testing.md`, `build-plan-tracker/20-performance.md`

- **Treating onboarding as part of the booking funnel catches “signed in but not yet usable” regressions that a normal booking smoke misses:** A separate Playwright path that starts with a brand-new authenticated user, completes `/onboarding`, and only then enters the booking wizard is a much better proxy for real first-use behavior than jumping straight into `/booking/new` with a pre-hydrated account.
  - Affected files: `tests/e2e/signup-booking-flow.spec.ts`, `build-plan-tracker/17-testing.md`

- **An internal observability panel is a good bridge when full platform integrations are still pending:** Showing health-check status, env readiness for Sentry/GA4/reminders, and quick links to `/api/health`, `/api/_test/sentry`, and audit history gives admins a practical checklist in dev without pretending external uptime monitors or source-map verification are already complete.
  - Affected files: `src/app/admin/observability/page.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `build-plan-tracker/18-observability.md`

- **Post-purchase dashboard states are much safer when every related record is normalized before crossing the server-to-client boundary:** Once real bookings and payments exist, raw Firestore document payloads can carry values that upset Next.js App Router serialization. Reusing the typed DB helpers (`getUserById`, `getServiceById`, `getModelById`, `getTechnicianById`) keeps dashboard and booking-detail props plain while making E2E assertions more stable around paid-booking scenarios.
  - Affected files: `src/app/dashboard/page.tsx`, `src/app/dashboard/profile/page.tsx`, `src/app/dashboard/technician/bookings/page.tsx`, `src/app/dashboard/technician/earnings/page.tsx`, `src/app/(main)/booking/[id]/booking-detail-client.tsx`, `tests/e2e/authenticated-dashboards.spec.ts`

- **Booking and notification UX gets noticeably calmer when every state explains the next action instead of just the current label:** On this project, pairing payment-return banners with a short `Qué sigue ahora` card, adding per-booking next-step copy in the dashboard, and grouping notifications into pending/history sections made the post-purchase experience feel much less ambiguous without adding any new backend complexity.
  - Affected files: `src/app/(main)/booking/[id]/booking-detail-client.tsx`, `src/app/dashboard/dashboard-bookings-client.tsx`, `src/app/dashboard/notifications/notifications-client.tsx`, `tests/e2e/authenticated-dashboards.spec.ts`, `build-plan-tracker/20-performance.md`

- **MercadoPago preference metadata deserves its own Firestore collection once refunds and retries exist:** Storing only `paymentLinkId`/`paymentLinkUrl` on the booking works for the happy path, but a separate `paymentLinks` DAL gives us a cleaner history of regenerated preferences, webhook outcomes, and refunds without turning the booking document into a payment-event log.
  - Affected files: `src/lib/db/payment-links.ts`, `src/app/api/bookings/route.ts`, `src/app/api/payments/initiate/route.ts`, `src/app/api/payments/webhook/route.ts`, `src/app/api/payments/[id]/refund/route.ts`, `build-plan-tracker/04-firestore.md`, `build-plan-tracker/09-payments.md`

- **Support gets much faster once every API response carries the same request ID that pino logs emit:** Adding `x-request-id` at the shared `withErrorHandling` layer means a browser report, an admin screenshot, and a server log line can all point to the same event without asking users to reproduce anything. Pairing that with an observability-panel readiness card makes the missing log-drain step obvious without blocking dev work.
  - Affected files: `src/lib/api-response.ts`, `src/lib/api-response.test.ts`, `src/app/admin/observability/page.tsx`, `build-plan-tracker/18-observability.md`

- **Search Console goes from “future work” to a one-line env flip if the root metadata already exposes the verification field:** Wiring `verification.google` to `GOOGLE_SITE_VERIFICATION` in the root layout keeps dev mode clean today while removing a later code deploy from the ownership-verification path.
  - Affected files: `src/app/layout.tsx`, `.env.example`, `build-plan-tracker/16-seo-legal.md`

- **If the active Firebase project is available, don't keep Firestore rules marked blocked out of habit:** Once `firebase-tools` can deploy `firestore.rules` to the shared dev project successfully, Phase 04 stops being an integration placeholder and becomes genuinely complete for day-to-day development.
  - Affected files: `build-plan-tracker/04-firestore.md`, `build-plan-tracker/README.md`

- **DNS TXT verification is the cleanest way to close Search Console for this project because it keeps ownership independent of app deploy timing:** Once the property is verified at the DNS layer, the SEO phase can be treated as complete even if the optional meta-tag hook remains unused.
  - Affected files: `build-plan-tracker/16-seo-legal.md`, `build-plan-tracker/README.md`
