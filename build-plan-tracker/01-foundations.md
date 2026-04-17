# Tracker — Phase 01: Foundations & Environment

> Status: ✅ COMPLETE
> Last updated: 2026-04-17

## Tasks

### 1.1 Environment Variables

- [x] .env.local created and filled with dev Firebase config
- [x] .env.local gitignored ✓
- [x] .env.example updated with all vars + comments
- [ ] Vercel env vars — deferred (needs Vercel CLI or dashboard access)

### 1.2 Dev Tooling

- [x] Prettier installed with prettier-plugin-tailwindcss
- [x] .prettierrc created
- [x] eslint-plugin-simple-import-sort installed
- [x] format / format:check scripts added to package.json
- [x] Husky installed + initialized
- [x] lint-staged configured in package.json
- [x] pre-commit hook: runs lint-staged
- [x] commit-msg hook: runs commitlint
- [x] commitlint.config.js created

### 1.3 TypeScript Strictness

- [x] strict: true ✓ (already present)
- [x] noUncheckedIndexedAccess: true added
- [x] noImplicitOverride: true added
- [x] @/\* path alias ✓ (already present)
- [x] tsc --noEmit → zero errors ✓

### 1.4 Zod + Shared Validators

- [x] src/lib/validators/user.ts
- [x] src/lib/validators/booking.ts
- [x] src/lib/validators/technician.ts
- [x] src/lib/validators/review.ts
- [x] src/lib/validators/service.ts
- [x] src/lib/api-response.ts (ok/fail/withErrorHandling helpers)

### 1.5 Error Handling Primitives

- [x] src/lib/errors.ts — AppError + AuthError, ForbiddenError, NotFoundError, ValidationError, PaymentError, ConflictError

### 1.6 Logger

- [x] pino + pino-pretty installed
- [x] src/lib/logger.ts — pretty in dev, JSON in prod, PII redaction configured

### 1.7 CI (GitHub Actions)

- [ ] .github/workflows/ci.yml — deferred (needs GitHub repo push)

### 1.8 Firebase Emulators

- [ ] Deferred to after Firebase CLI setup

### 1.9 Package Scripts

- [x] dev, build, start, lint, format, format:check, type-check, emulators, test, test:watch, test:e2e
- [x] engines.node >= 20.15.0

## Notes

- pino moved to dependencies (not devDependencies) — needed at runtime for server-side logging
- @fontsource-variable/inter added — next/font/google fails in no-internet build sandbox
- layout.tsx updated: Inter font, OG metadata, lang="es"
- globals.css updated: full design token set, prefers-reduced-motion, Inter as base font
- Build passes clean: 17 routes, 0 warnings ✓
