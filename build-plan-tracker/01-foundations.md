# Tracker — Phase 01: Foundations & Environment

> Status: ⬜ NOT STARTED
> Last updated: 2026-04-17

## Tasks

### 1.1 Environment Variables
- [ ] Create `.env.local` from `.env.example` (needs dev Firebase config from Germán)
- [ ] Verify `.env.local` is gitignored ✓ (already in .gitignore)
- [ ] Add all env vars to Vercel (needs Vercel project access)

### 1.2 Dev Tooling
- [ ] Install + configure Prettier with tailwindcss plugin
- [ ] Install ESLint import sort plugin
- [ ] Add format scripts to package.json
- [ ] Install Husky + lint-staged
- [ ] Configure commitlint for Conventional Commits

### 1.3 TypeScript Strictness
- [ ] Verify/update tsconfig.json strict flags
- [ ] Confirm `@/*` path alias works
- [ ] Run `tsc --noEmit` → zero errors

### 1.4 Zod + Shared Validators
- [ ] Create `src/lib/validators/` with typed validator files
- [ ] Create `src/lib/api-response.ts` helpers

### 1.5 Error Handling Primitives
- [ ] Create `src/lib/errors.ts` with AppError + subclasses (bilingual messages)

### 1.6 Logger
- [ ] Install pino + pino-pretty
- [ ] Create `src/lib/logger.ts`

### 1.7 CI (GitHub Actions)
- [ ] Create `.github/workflows/ci.yml` (needs GitHub repo)

### 1.8 Firebase Emulators
- [ ] Init emulators (needs Firebase CLI + project)
- [ ] Update firebase.ts to connect to emulators when env flag set

### 1.9 Package Scripts
- [ ] Add all required npm scripts to package.json
- [ ] Add `engines.node >= 20.15.0`

## Notes

- Tasks 1.1, 1.7, 1.8 depend on Phase 00 (credentials/external setup)
- Tasks 1.2, 1.3, 1.4, 1.5, 1.6, 1.9 can proceed without credentials — do these first
- zod is already installed (v4.3.6) ✓
