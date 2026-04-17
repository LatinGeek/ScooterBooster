# Phase 01 — Foundations & Environment

> **Goal:** Lock down config, env vars, dev tooling, and CI so every later phase builds on a solid base.

## 1.1 — Environment Variables

- [ ] Create `.env.local` from `.env.example` and fill in **dev** Firebase config
- [ ] Verify `.env.local` is gitignored
- [ ] Add all required vars to Vercel (Preview + Production scopes) via MCP or `vercel env add`:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
  - `FIREBASE_ADMIN_PROJECT_ID`
  - `FIREBASE_ADMIN_CLIENT_EMAIL`
  - `FIREBASE_ADMIN_PRIVATE_KEY` (escape newlines as `\n`)
  - `MERCADOPAGO_ACCESS_TOKEN` (test token for now)
  - `MERCADOPAGO_PUBLIC_KEY`
  - `NEXT_PUBLIC_APP_URL` = `https://scooterbooster.uy` (prod) / preview URL (preview)
  - `SERVICE_FEE_PERCENTAGE` = `10`
- [ ] Document all env vars in `.env.example` with comments
- [ ] Document MercadoPago test vs prod credentials in `knowledge-base/integrations/mercadopago.md`

## 1.2 — Dev Tooling

- [ ] Install Prettier: `npm i -D prettier prettier-plugin-tailwindcss`
- [ ] Create `.prettierrc` with Tailwind plugin
- [ ] Install ESLint import sort: `npm i -D eslint-plugin-simple-import-sort`
- [ ] Add `format` and `format:check` scripts to `package.json`
- [ ] Install Husky + lint-staged: `npm i -D husky lint-staged && npx husky init`
- [ ] Configure `lint-staged` to run Prettier + ESLint on staged files
- [ ] Add commit-msg hook to enforce Conventional Commits (`commitlint`)
- [ ] Install `@commitlint/cli @commitlint/config-conventional`

## 1.3 — TypeScript Strictness

- [ ] Verify `tsconfig.json` has `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`
- [ ] Add path alias for `@/*` and confirm it works
- [ ] Run `npx tsc --noEmit` — must pass with zero errors

## 1.4 — Zod + Shared Validators

- [ ] Install: `npm i zod`
- [ ] Create `src/lib/validators/` folder
- [ ] Add placeholder validator files: `user.ts`, `booking.ts`, `technician.ts`, `review.ts`, `service.ts`
- [ ] Export a shared `src/lib/api-response.ts` with `ok<T>(data)` / `fail(code, message)` helpers returning `ApiResponse<T>`

## 1.5 — Error Handling Primitives

- [ ] Create `src/lib/errors.ts` with `AppError` base class and typed subclasses (`AuthError`, `ValidationError`, `NotFoundError`, `ForbiddenError`, `PaymentError`)
- [ ] Each has a Spanish user-facing message and an English log message

## 1.6 — Logger

- [ ] Install `pino` + `pino-pretty` (dev only)
- [ ] Create `src/lib/logger.ts` — pretty in dev, JSON in prod
- [ ] Never log PII, tokens, or secrets

## 1.7 — CI (GitHub Actions)

- [ ] Create `.github/workflows/ci.yml` that runs on every PR:
  - Checkout, setup Node 20
  - `npm ci`
  - `npm run lint`
  - `npm run format:check`
  - `npx tsc --noEmit`
  - `npm run build`
- [ ] Add status checks as required for merging to `main`
- [ ] Verify CI passes green on a test PR

## 1.8 — Firebase Emulators (Local Dev)

- [ ] Install emulator suite: `firebase init emulators` → Auth, Firestore, Functions (skip), Storage
- [ ] Choose default ports (9099 auth, 8080 firestore, 9199 storage, 4000 UI)
- [ ] Add `npm run emulators` script: `firebase emulators:start --import=./.firebase-data --export-on-exit`
- [ ] Update `src/lib/firebase.ts` to auto-connect to emulators when `NEXT_PUBLIC_USE_EMULATORS=true`
- [ ] Add `.firebase-data/` to `.gitignore`

## 1.9 — Package Scripts

- [ ] Ensure `package.json` has: `dev`, `build`, `start`, `lint`, `format`, `format:check`, `emulators`, `type-check`, `test`, `test:e2e`
- [ ] Add `engines.node` = `>=20.15.0`

## Exit Criteria

- [ ] `npm run dev` starts cleanly on `localhost:3000`
- [ ] `npm run emulators` starts Firebase emulators and the app connects to them
- [ ] `npm run build` succeeds with zero warnings
- [ ] `npm run lint && npm run format:check && npm run type-check` all pass
- [ ] CI passes on a test PR
- [ ] All env vars set in Vercel for both Preview and Production
