# W0 report — Plan / ADR / fixtures (FP-PLAN)

Date 2026-11-07 · Task `task_ce5578de9501` · Dispatch `ctx_b0630f5ef37e` · Branch `LatinGeek/fp-w0-architect` · **No candidate-readiness claim.**

## Deliverables (all in this worktree, untracked, no Git mutation)

- `docs/firmware-patcher-design.md` — G0/G1/G2 (+D1–D4, D7–D9) recorded; ADR-001 Option A (B/C rejected, no-outbound boundary); D5/G5/D6 choices; next owners.
- `build-plan/firmware-patcher/matrix-draft.md` — 11 models × upstream codes + custom `mss0exp`; compact JSON; introspection script; findings.
- `build-plan/firmware-patcher/fixtures.md` — provenance, hashes, storage, redistribution, MSS0 golden verification, reference vectors, ship/do-not-ship per model.

## Baseline (SPEC §7) — HEAD `dec672512e1a91f5ec75dc6ddd576721f0a0a455`, `git status --short` clean before W0 files

Host: Windows 11, Node v22.23.3, npm 10.9.9. `npm ci --cache D:\npm-cache`: attempt 1 ENOSPC (C: full), attempt 2 `TAR_ENTRY_ERROR UNKNOWN` (exit 1, 463 s), attempt 3 **exit 0, 1216 s** (registry fetches 10–18 min under host contention).

| Command | Exit | Duration | Result vs SPEC §7 |
| ------- | ---- | -------- | ----------------- |
| `npm run type-check` (fresh) | **2** | 159 s | **DRIFT**: `src/app/admin/users/page.tsx(9,53) TS2304 Cannot find name 'PageProps'` — Next 16 global `PageProps` comes from generated types; absent until a build/typegen has run. |
| `npm run type-check` (after build) | 0 | 55 s | PASS (matches SPEC) |
| `npm run lint` | 1 | 185 s | **Matches**: 14 errors, 5 warnings |
| `npm test` | 1 | 74 s | **Matches**: 68/69 files, 251/253 tests; only `uruguay-locations.test.ts` (Malvín) fails |
| `npm run build` (no env) | 1 | 285 s | **DRIFT**: "Failed to collect page data for /api/admin/technicians" — Firebase Admin `project_id` missing (no `.env.local` in fresh worktree) |
| `npm run build` (throwaway fake Firebase env, in-process only) | 0 | 298 s | PASS: compiled in 51 s, 38 static pages; `tsconfig.json` not mutated |
| `npm run test:e2e` | not run | — | **UNVERIFIED**: needs real `.env.local` Firebase Admin creds (specs write fixtures to the shared dev Firestore), fixed port 3000 (sibling workers), `start:e2e` rebuild inside a 120 s webServer timeout; no credentials were copied. |

Host caveat: memory commit-limit errors (`0xC000012D`) appeared during runs; C: was 4–7 GB free.

## Key findings

1. **MSS0 offsets/hashes: no disagreement.** All six SPEC §4.7 SHA-256s match real files; final bytes at all 8 Base + 6 Lite sites match; pinned Python (`Mi6Patcher`/`Mi6litePatcher`: sls35/sld25/slp15 → SPEC site writes → chk → img) **reproduces both golden hashes from stock**.
2. **Matrix** introspected from real pinned classes (Py 3.13.15, keystone 0.9.2, capstone 4.0.2, crcmod 1.7, setuptools 80.10): only `mi6.mss`/`mi6lite.mss` are experimental; zero GUI-vs-impl discrepancies. Ranges = source-verified; `mss0exp` = spec + golden-verified.
3. **Fixtures:** only `mi6` (firmware variant **V2**) and `mi6lite` have real files; the other 9 models are **do not ship**; Base V1 has no fixture. Dashboard files are negative detection vectors. Vendor firmware is non-redistributable; provenance origin unrecorded.
4. **Oracle pitfall:** `third_party/bw-patcher` is the fork (a176ee6, v1.1.3.post1, dirty) — not the pin; used `git archive 95a8f33` (v1.1.6 confirmed).
5. **Licence fact:** pinned LICENSE is CC BY-NC-SA 4.0 (NonCommercial/ShareAlike). G0 accepted by owner; flagged only for the authorization record / PROVENANCE.md — not decided by W0.
6. `SPEC.md`/`PROMPT.md` are **not in this worktree** (untracked in `D:\Coding\ScooterBooster`); later workers need a copy.
7. Python gotchas: `capstone==4.0.2` needs `import setuptools` first on Py ≥ 3.12; `mss=0` unreachable via `patch_firmware` (truthiness); `mi5plus` uses banker's rounding.

## Remaining choices (smallest decision) — see design doc §6

- **D5:** confirm fail-closed (default).
- **G5:** confirm ship scope = `mi6` (V2) + `mi6lite`; Base V1 unsupported unless a V1 fixture is supplied.
- **D6:** confirm `rfm`/`rsls` stay hidden.

## Open items / next owners

W1: detection + capabilities from matrix-draft and fixtures §3/§6. W2: parity harness using fixtures §4/§5 and env recipe (design §5). Owner: authorization reference text, licence-term confirmation, fixture origin record, E2E credentials/environment if E2E is required. Scratch (venv, upstream export, outputs) lives in the session scratchpad outside the repo; no firmware or secrets in the repo.
