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
