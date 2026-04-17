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
