# Integrator report (W6 / FP-INTEGRATE-FINAL)

- **Task / attempt / run:** `task_8687bb0daadd` / `ctx_28df53cd0fb3` / `run_92b2b3cfb0ad`
- **Workspace:** `C:/Users/germa/orca/workspaces/ScooterBooster/fp-integrator`
- **Base:** `dec672512e1a91f5ec75dc6ddd576721f0a0a455` (verified; tree clean apart from the W0 worktree note below)
- **Integration branch:** `integrate/fp-final` (local only, not pushed)
- **Candidate identity:** git tag `fp-candidate-final` -> the commit that contains this report.
  The exact 40-char SHA is reported in the `worker_done` handoff and is the tag target.
- **Status:** integrated candidate built and smoke-checked. **No release acceptance claimed.**

## 1. Delivery verification (immutable inputs)

Every authoritative delivery commit exists, is based on `dec6725`, and equals its branch head at
handoff time (no superseded/amended delivery was integrated). The working tree was at `dec6725`
with one pre-existing untracked file (`build-plan/firmware-patcher/reports/integrator-report.md`,
82 bytes, the previous blocked attempt); it was replaced by this report.

| Delivery | Task | Branch head = authoritative SHA | Based on dec6725 | Integrated (cherry-pick of delivery range) | Content |
| --- | --- | --- | --- | --- | --- |
| W0 docs | `task_2d8400a065a0` | `35f2ae8f7ab42b92c8df86fa8db5e58aee92ab9b` | yes (parent) | `0d4e3e0c5204b3df063505e7dfcad07d4af1e1d2` | 4 files, identical |
| Core | `task_3ba46a4e32e4` | `110980c1db3311ede3b67dc12524708b1cf65fde` | yes (`db99d66` <- dec6725) | `2b95ac1` + `95cc23f` + `bd8a4259338a43acef3e6ed74e67876c1a8da833` | 51 files; 50 identical, `engine/pipeline.test.ts` scoped (seam S2) |
| API | `task_07e47b275efc` | `a62f1c3e8845b945d9ea376e82a26b7b55b5fca1` | yes (parent) | `1a376774ad410538d7ec47d1b76af3a7d482e479` | 23 files; 21 identical, `server/engine.ts` + `server/contract.ts` aligned to real Core (seam S1) |
| UI | `task_ea39360a4d5c` | `28327060a5f808b8bbc5837dd062eea2cb354d01` | yes (`20b3d12` <- dec6725) | `43a2455` + `3feafa5cb2ebbe55a5bf6e34ed20a3d85d4308a5` | 29 files, identical |

Content identity was checked per delivery with `git diff <delivery-sha> HEAD -- <its changed paths>`
**before** the two authorized seam edits. Order applied: **W0 -> Core -> API -> UI**. No merge
conflicts occurred: the four deliveries touch disjoint paths (the only shared folder,
`build-plan/firmware-patcher/reports/`, has distinct filenames). `package.json` (Core) and
`.env.example` (API) are single-owner seams; both applied cleanly.

## 2. Per-item integration status

| Item | Status | Source -> integrated identity |
| --- | --- | --- |
| W0 design doc, matrix draft, fixtures, w0 report | **APPLIED** | `35f2ae8` -> `0d4e3e0` (4/4 files identical) |
| Core detection/matrix/CRC/Thumb goldens | **APPLIED** | `db99d66` -> `2b95ac1` (18 files identical) |
| Core engine, 11 model ports, MSS0, parity/bench, scripts | **APPLIED** | `9487ca5` -> `95cc23f` (33 files, one assertion scope edit in `pipeline.test.ts`) |
| Core final report `docs/firmware-patcher/CORE-REPORT.md` | **APPLIED** | `110980c` -> `bd8a425` (identical) |
| API routes (capabilities/detect/patch), server helpers, ratelimit, docs, env | **APPLIED** | `a62f1c3` -> `1a37677` (adapter + contract type aligned to real Core) |
| UI panel, pages, nav, unit tests, evidence, e2e spec, report | **APPLIED** | `20b3d12` + `2832706` -> `43a2455` + `3feafa5` (29/29 files identical) |
| Anything superseded/amended | **OMITTED** | none found; all four branch heads matched the authorized SHAs |
| Shared seam `package.json` (`firmware:parity`, `firmware:bench`) | **APPLIED** | from Core, no other delivery touched it |
| Shared seam `.env.example` (both feature flags, default `false`) | **APPLIED** | from API, no other delivery touched it |
| Layouts (`admin`, `technician/dashboard`) | **APPLIED** | from UI; no conflict with base or API |
| Docs (`docs/firmware-patcher-design.md`, `CORE-REPORT.md`, `firmware-patcher.md`) | **APPLIED** | distinct paths, no conflict |

## 3. Authorized seam resolutions

### S1 - API engine adapter vs real Core (`server/engine.ts`, `server/contract.ts`)

The API was verified against untracked stubs; the adapter did not compile against the real Core
surface. Fixes are confined to the file the API report named as the only seam:

1. `getCapabilities()` does not exist in Core. Adapter now builds the view from
   `CAPABILITIES_UPSTREAM` and `CAPABILITY_MATRIX` (no new Core export added).
2. Core's patch field is `valueKind`; adapter maps it to the API contract's `kind`.
3. Core `detection.hits` is `{model, score, reasons[]}[]`; the API/UI contract is `string[]`.
   Adapter now emits `model (score): reasons...` per candidate, preserving both score and the
   byte-exact upstream reason strings.
4. Core entry point is the package barrel (`@/lib/firmware-patcher`), not `.../engine`; import
   corrected. Client selection is mapped to `PatchSelectionEntry` (the route already validated
   codes; the engine re-validates them).
5. Patch-log `offset` is an upstream Python `hex()` string (e.g. `0x1a2c`); the contract type was
   widened from `number` to `number | string`. The UI already accepts both and the route tests
   (numeric fixture) still pass.

Verified end-to-end against the real Core and a **real mi6 factory image**: capabilities expose
11 models, `detect` reports `mi6 / supported`, `patch` with `sls=35,sld=25,slp=15,mss0exp`
produces SHA-256 `7a66169940c538eb3310136a5affa99d588c5a2c2d11b8e0ec5bedabc1c8d747` (match).

### S2 - Core architectural test vs API transport layer (`engine/pipeline.test.ts`)

Core asserts that files under `src/lib/firmware-patcher` contain no React/Next imports. The API
delivery legitimately added the Next-coupled transport layer at `src/lib/firmware-patcher/server/`.
The walk now excludes `server/` (with a comment); the invariant is unchanged for every engine
file and the file-count floor (`>20`) still holds. No assertion was deleted or relaxed.

## 4. Smoke checks on the exact integrated candidate

Host: Windows 11, Node v22.23.3, npm 10.9.9, Next.js 16.2.4. `node_modules` was reused from the
sibling `fp-core` worktree because `package-lock.json` is byte-identical to the base and the Core
worktree was installed from it; `npm ci` was not needed (C: free went 4.52 -> 3.29 GB).

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx next typegen && npm run type-check` | **exit 0** |
| Production build | `npm run build` (throwaway fake Firebase env, in-process only) | **exit 0**; compiled in 13.3 s; route table includes `/admin/firmware-patcher`, `/dashboard/technician/firmware-patcher` and all three API routes |
| Core library tests | `npx vitest run src/lib/firmware-patcher --maxWorkers=2` | **200/200 passed** (10 files) |
| Real-fixture parity vectors | `parity.test.ts` + `pipeline.test.ts` (fixtures present at `D:/Coding/Firmware disassembling/firmware`) | **32/32 passed**, including the 16 mi6/mi6lite parity vectors and output SHA-256 checks |
| API tests | `npx vitest run src/app/api/admin/firmware-patcher src/lib/ratelimit.test.ts` | **92/92 passed** (4 files) |
| UI tests | `npx vitest run src/components/firmware-patcher` | **42/42 passed** (3 files) |
| Full suite | `npm test -- --maxWorkers=2` | **580/582 passed**, 85 files; only the 2 pre-existing `uruguay-locations.test.ts` failures (baseline, unrelated) |
| Full lint | `npm run lint` | **14 errors / 7 warnings** (baseline was 14/5; the 2 extra warnings are API-owned: unused `_req` in `capabilities/route.ts`, stale eslint-disable in `server/filename.ts`). Zero errors from firmware-patcher |
| Touched-file eslint | `npx eslint server/engine.ts server/contract.ts engine/pipeline.test.ts` | **exit 0**, no findings |
| E2E spec collection | `npx playwright test tests/e2e/firmware-patcher.spec.ts --list` | 5 tests collected, exit 0 |
| E2E execution | - | **UNVERIFIED** (no `.env.local` / Firebase creds; spec self-skips otherwise). Not weakened or deleted |

Standalone Python parity harness (`npm run firmware:parity`) was **NOT RUN**: it requires a clean
`bw-patcher` checkout at `95a8f33` and a Python with keystone/capstone/crcmod. Only the fork
(`a176ee6`, dirty v1.1.3.post1) is present and the available venvs lack `keystone`+`crcmod`
together. The equivalent evidence is the committed parity goldens exercised against real
fixtures in `parity.test.ts` (green), plus the adapter-vs-Core golden reproduction above.

## 5. Outstanding gates (not closed by integration)

1. **E2E unverified** - provide a dev Firebase service account + client config and both flags
   `true`, then run `npx playwright test tests/e2e/firmware-patcher.spec.ts`.
2. **Release acceptance** - enabling `FIRMWARE_PATCHER_ENABLED` /
   `NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED` in any deployed environment is a product-owner action;
   the candidate ships with both `false`.
3. **Model coverage** - only `mi6` (V2) and `mi6lite` have real-fixture parity and are shipped;
   the other nine models are detect-only/unsupported per SPEC G5. No Base V1 fixture.
4. **`mss0exp` is experimental** - byte/CRC/golden parity proven, hardware behaviour not validated.
5. **Standalone parity harness not executed** here (environment, see above); re-run on a host with
   the pinned reference before any upstream-pin change.
6. **Two non-blocking API lint warnings** remain (lint errors unchanged at the 14-error baseline).
7. `README.md` docs link was not added (API report open item; outside delivery ownership).
8. Build smoke used throwaway fake Firebase values because no real `.env.local` exists in this
   workspace; a build with production credentials is unverified.

## 6. Safety / environment

- No push, deploy, external mutation, destructive cleanup or secret exposure. No real firmware,
  credentials or generated `.next`/parity outputs were committed.
- Fixtures were read from their external path; they are never copied into the repo.
- Candidate flags default to `false`; no audit/DB writes were performed by the smoke checks.
- Next owner: **supervisor `task_320b478fc745` / `ctx_c5b8eeb317c9`** - review candidate tag
  `fp-candidate-final`, resolve the gates above, and decide release acceptance.
