# Firmware Patcher — Run Record

> **Integrated into `master`:** fast-forwarded `master` from `dec6725` to `888b8d0` on 2026-11-07, then added the spec/prompt/run docs (`99202d4`) and restored the lint baseline (`4edc8ee`). Local only; no push at integration time.

**Date:** 2026-11-07
**Run:** `run_92b2b3cfb0ad`
**Coordinator:** `term_639bf562-70f7-495f-ab13-a00f2924735a`
**Objective:** Admin/technician Firmware Patcher for ScooterBooster, cloning `scooterteam/bw-patcher` v1.1.6 at `95a8f339787a1fb6486554d61b573b8e2b688c53`, including the latest MSS0 coherent-latch experiment (`mss0exp`).

## Owner decisions (recorded)

| ID | Decision | Status |
|---|---|---|
| G0 | Owner authorized bw-patcher use (2026-11-07) | ACCEPTED |
| G1/D2 | No legal disclaimer; internal tool; keep a non-blocking operational warning | ACCEPTED |
| D3 | Both `admin` and `technician` may use experimental patches | ACCEPTED |
| D4 | Both roles may use full-dump mode | ACCEPTED |
| D7/G2 | Option A — pure TypeScript port inside Next.js | ACCEPTED |
| D8 | Online operation allowed; v1 makes no outbound calls | ACCEPTED |
| D9 | Integrate latest MSS0 coherent-latch experiment for `mi6`/`mi6lite` | ACCEPTED |
| D5 | Audit failure behaviour | default fail-closed |
| G5 | Ship only models with lawful real fixtures and byte-for-byte parity | open per model |
| D6 | Keep `rfm`/`rsls` hidden (upstream GUI parity) | accepted |

## Active dispatches

All six report `liveness=live`, `activity=working` at sign-off. The supervisor was started last.

| Workstream | Task | Dispatch | Worktree | Agent | Scope |
|---|---|---|---|---|---|
| W0 Plan/ADR/fixtures | `task_ce5578de9501` | `ctx_b0630f5ef37e` | `fp-w0-architect` | Claude | ADR, matrix draft, fixture corpus, baseline |
| Core (W1+W2) | `task_8f9391c506bf` | `ctx_eac5709423a3` | `fp-core` | Claude | detection, capabilities, types, engine, MSS0, parity |
| API (W3) | `task_07e47b275efc` | `ctx_82a35facef22` | `fp-api` | Claude | routes, validation, audit, rate limits, docs |
| UI (W4) | `task_824f8a1936ae` | `ctx_19e8412f435c` | `fp-ui` | Claude | admin/technician pages, nav, UI tests |
| Integrator (W6) | `task_2b3e20011def` | `ctx_522f4dbbc534` | `fp-integrator` | Claude | integrate Core → API → UI (replacement) |
| Supervisor/final verifier (W7) | `task_320b478fc745` | `ctx_c5b8eeb317c9` | `fp-supervisor` | Claude | monitor, verify, report; **started last** |

## Provider recovery

The first Codex attempts hit the Codex usage limit before doing useful work. They were stopped and are retained for audit; they must not be integrated:

| Workstream | Task | Dispatch | State |
|---|---|---|---|
| Core (Codex) | `task_d65fec4ee3d7` | `ctx_a75134b84c18` | stopped / failed — usage limit |
| API (Codex) | `task_1e38e35dab7c` | `ctx_1c0a5bad4efa` | stopped / failed — usage limit |
| Integrator (Codex) | `task_40ff3ab4b786` | `ctx_b32b69d80560` | stopped / failed — usage limit |
| Integrator (first Claude) | `task_db2507e686cb` | `ctx_423102706b67` | stopped / failed — agent exited leaving a shell |
| Supervisor (first attempt) | `task_db280ce511d2` | `ctx_e81a40b1069e` | stopped to re-launch supervisor last |

The replacements use Claude on the same worktrees. No Codex attempt produced an integrated candidate.

## Environment recovery

- Baseline `npm ci` across worktrees filled `C:` (0.39 GB free).
- Cleared the npm content-addressable cache under `C:\Users\germa\AppData\Local\npm-cache\_cacache` (6.62 GB); `C:` now has ~7.75 GB free.
- Workers were told to use `npm ci --cache D:\npm-cache` and not to delete other worktrees or user files.
- W0 was nudged after a long cleanup hook, confirmed the recovery, and is retrying its install with the D: cache while continuing the design docs.
- The npm cache was moved to `D:\npm-cache`; the C: `_npx` cache was cleared. C: free space recovered to ~4.4 GB and rising.
- The first Claude integrator exited at a bare PowerShell prompt; it was stopped/fenced and replaced by `task_2b3e20011def` / `ctx_522f4dbbc534` on the same worktree.
- Supervisor checkpoint 3: no candidate yet; it was told to stay idle and will be woken once Core/API/UI commits and an integrated candidate SHA exist. Memory pressure was noted; completed agents will be stopped before final verification.

## Final candidate and verification

- **Candidate tag:** `fp-candidate-final`
- **Candidate commit:** `888b8d0c7b3d1eb3df66261cfeddecd1d35e598c` (content `8077ec2`, base `dec6725`, no push)
- **Integrated worktree:** `C:/Users/germa/orca/workspaces/ScooterBooster/fp-integrator`
- **Supervisor verdict:** **CONDITIONALLY VERIFIED** — all verified gates pass; E2E remains UNVERIFIED without Firebase credentials.
- Type-check PASS; build PASS; Core 200/200; API 92/92; UI 42/42; full suite 580/582 with only the two pre-existing `uruguay-locations` failures.
- Real-fixture parity: 32/32 vectors; standalone Python parity 18/18 PASS. MSS0 goldens match: Base `7a6616...`, Lite `98f127...`.
- Lint on the verified candidate: 14 errors/7 warnings vs baseline 14/5. Final master restored the baseline to 14 errors/5 warnings (`4edc8ee`).
- API/security/UI checks pass: both roles, no disclaimer gate, `mss0exp` supersedes `mss`, no persistence, 375/768/1280 no horizontal overflow.
- Open gates: E2E UNVERIFIED (Firebase dev creds + both flags true at build); both feature flags default false; 9 models synthetic-only/hidden; `mss0exp` not hardware validated.
- **Final master:** `4edc8ee878c287f38a99bdb18f2cedf4cf721457` — verified candidate `888b8d0` plus docs (`99202d4`) and lint-baseline fix (`4edc8ee`). Re-verified on final master: type-check PASS, build PASS, targeted capabilities tests 10/10; full suite remains 580/582 with only the two pre-existing baseline failures.
- **Release acceptance:** not granted; product owner decision remains.

## Evidence / next action

- The specification and prompt pack are untracked in the main worktree and must be committed or supplied to workers before handoff: `SPEC.md`, `PROMPT.md`, this `RUN.md`.
- The supervisor owns the final integrated verification and must not claim release acceptance.
- Candidate readiness requires the SPEC §8 matrix, including MSS0 Base `7a6616...` and Lite `98f127...` golden hashes.
- This record is a dispatch sign-off, not a candidate-readiness or release-acceptance decision.
