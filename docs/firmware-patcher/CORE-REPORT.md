# Firmware Patcher Core — final report

- **Task / attempt / run:** FP-CORE-FINALIZE / live preamble IDs (`task_3ba46a4e32e4`, `ctx_b6b2b7d71cd9`)
- **Workspace:** `C:/Users/germa/orca/workspaces/ScooterBooster/fp-core`
- **Base commit:** `dec672512e1a91f5ec75dc6ddd576721f0a0a455`
- **Upstream pin:** `scooterteam/bw-patcher` v1.1.6 @ `95a8f339787a1fb6486554d61b573b8e2b688c53`
- **Final commit:** `<FINAL_SHA>` (filled after commit)
- **Status:** core complete; real-fixture parity green; nine models synthetic-only per SPEC G5.

## 1. What was delivered

| Area                       | Files                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| Detection / matrix / CRC   | `src/lib/firmware-patcher/{detect,capabilities,crc,types}.ts` (verified, unchanged unless noted) |
| Thumb assembler / decoder  | `src/lib/firmware-patcher/assembler/{thumb,decoder}.ts` + keystone goldens                       |
| Engine primitives          | `engine/{core,core-lks32,core-es32,core-n32,leqi-speed,pattern,py-compat,errors,mss0}.ts`        |
| Model ports (11)           | `engine/models/{mi4,mi4lite,mi4pro2nd,mi5,mi5max,mi5pro,mi5elite,mi5plus,mi6,mi6lite,ultra4}.ts` |
| Static allow-list dispatch | `engine/registry.ts` (no dynamic imports)                                                        |
| Public entry point         | `engine/pipeline.ts` (`applyFirmwarePatches`), `index.ts`                                        |
| `mss0exp`                  | `engine/mss0.ts` (SPEC §4.7 body offsets, both models)                                           |
| Tests                      | 10 files / 200 tests under `src/lib/firmware-patcher`                                            |
| Parity harness             | `scripts/firmware-parity.ts` + existing Python runners                                           |
| Benchmarks                 | `scripts/firmware-bench.ts`                                                                      |
| Provenance / report        | `src/lib/firmware-patcher/PROVENANCE.md`, this file                                              |

Canonical order implemented: `sls, sld, slp, dms, fdv, cce, mss, mss0exp, chk, img`.
`chk`/`img` are server-managed and rejected from client selections. `mss0exp` supersedes `mss`.

## 2. Verification commands and exits

| Command                                     | Result                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npx vitest run src/lib/firmware-patcher`   | **10 files / 200 tests passed**, exit 0                                                         |
| `npx tsc --noEmit` after `npx next typegen` | **exit 0** (route types regenerate `PageProps`)                                                 |
| `npm run lint`                              | **14 errors / 5 warnings**, exactly the recorded baseline; zero from `firmware-patcher`/scripts |
| `npm test`                                  | **451 passed, 2 failed** (both `uruguay-locations.test.ts`, baseline), exit 1                   |
| `npx tsx scripts/firmware-parity.ts ...`    | **PASS, 18/18 comparisons**, exit 0                                                             |
| `npx tsx scripts/firmware-bench.ts`         | **PASS** (FP-016 thresholds)                                                                    |

Parity report: `tmp/firmware-parity-report.json` (generated, not committed).
Reference: clean worktree at `95a8f33`, Python 3.14.4, keystone 0.9.2, capstone 4.0.2, crcmod 1.7.

## 3. Golden results

| Case                                    | SHA-256                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| mi6 Base factory (input)                | `31362a4863d3430fdd90812fe175a4b37e9f426207ce804afeeba0f6432e4a2b` |
| mi6 Base `sls=35,sld=25,slp=15,mss0exp` | `7a66169940c538eb3310136a5affa99d588c5a2c2d11b8e0ec5bedabc1c8d747` |
| mi6 Lite factory (input)                | `83d3d3c05cce80be5d0f1e42046b9b792423beec2d5e6e96af873d8c5c3a4d7d` |
| mi6 Lite `sls=35,sld=25,slp=15,mss0exp` | `98f12702b11024472749f76d6305d32f99456babe740ea3cbf2fe1fecf0150db` |

`mss0exp` tests assert: exact final bytes at all 8 Base / 6 Lite sites, golden SHA-256, CRC-16
valid over the encrypted body, only listed sites + CRC differ, body-level idempotency, unknown
predecessor rejection, and `mss` supersession.

Real-fixture parity vectors (16) cover individual and combined `sls`/`sld`/`slp`/`mss`,
full-dump mode, ordered logs and output hashes for both shipped models. Raw encrypted-body
inputs were also compared (`7e10eedc…` Base, `34c10493…` Lite).

## 4. Benchmarks (FP-016)

Measured on the validation host, 30 warm iterations, 1 MiB padded mi6 input:

| Metric                                       | p50      | p95          | max      | Threshold |
| -------------------------------------------- | -------- | ------------ | -------- | --------- |
| Detection                                    | 0.012 ms | **0.121 ms** | 0.166 ms | ≤ 150 ms  |
| Patch (6 codes: sls/sld/slp/mss0exp/chk/img) | 5.36 ms  | **9.10 ms**  | 11.51 ms | ≤ 1.5 s   |

Heap delta was negative after GC and is not a reliable per-request figure; the benchmark
script reports it as approximate. Real firmware binaries are never committed.

## 5. Unresolved gates / caveats

1. **Nine models are synthetic-only.** `mi4`, `mi4lite`, `mi4pro2nd`, `mi5`, `mi5max`, `mi5pro`,
   `mi5elite`, `mi5plus`, `ultra4` are fully ported and statically dispatched, but no genuine
   firmware exists in the fixture set. They remain detectable-but-unsupported under SPEC G5 and
   must not ship until real-fixture parity is recorded. The parity harness lists them as
   `synthetic-only / NOT_RUN`.
2. **`mss0exp` is experimental and not physically validated.** Hash/CRC/byte containment are
   proven; launch torque/braking under load is not.
3. **No 1 MiB genuine patch fixture.** The 1 MiB benchmark uses the genuine 148 KiB image with a
   padded footer; the parsed Leqi body remains the real 43 KiB image. This measures the engine's
   1 MiB I/O cost, not a 1 MiB body.
4. **Full-dump + `mss0exp`** skips `chk` (upstream semantics), so the CRC is intentionally not
   refreshed in that combination. Documented rather than silently changed.
5. **Memory** was not instrumented with forced GC; the 256 MiB incremental requirement is not
   proven by a controlled allocation trace.
6. No API/UI, persistence, flashing or MSS0 experiment-file changes were made (non-goals).

## 6. Reproduce

```sh
npx vitest run src/lib/firmware-patcher
npx next typegen && npx tsc --noEmit
npx tsx scripts/firmware-parity.ts --ref <bw-patcher @ 95a8f33> \
  --python <python with keystone/capstone/crcmod> --out tmp/firmware-parity-report.json
npx tsx scripts/firmware-bench.ts --out tmp/firmware-bench.json
```
