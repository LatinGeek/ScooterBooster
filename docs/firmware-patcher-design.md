# Firmware Patcher — design package (W0)

> **Run scope:** FP-PLAN · **Author:** W0 · **Date:** 2026-11-07
> **Requirements authority:** `build-plan/firmware-patcher/SPEC.md` v1.0 (kept outside this worktree at `D:\Coding\ScooterBooster\build-plan\firmware-patcher\`; see report note). This document records decisions and design; it does **not** restate or change requirements — reference IDs (G*, D*, FP-*).
> **Repo baseline:** `dec672512e1a91f5ec75dc6ddd576721f0a0a455` (`master`). **Upstream pin:** `scooterteam/bw-patcher` v1.1.6, `95a8f339787a1fb6486554d61b573b8e2b688c53`.
> **Companions:** `build-plan/firmware-patcher/matrix-draft.md` · `build-plan/firmware-patcher/fixtures.md` · `build-plan/firmware-patcher/reports/w0-report.md`
> **Status:** design input for W1–W4. Not a candidate-readiness claim.

---

## 1. Accepted decisions (recorded, not re-opened)

| ID | Decision | Source | State |
| -- | -------- | ------ | ----- |
| G0 / D1 | Owner confirmed (2026-11-07) authorization to use `bw-patcher`. Authorization reference must be recorded in the run record and `docs/firmware-patcher.md` (W3). Upstream pin, attribution and licence notice stay mandatory. | SPEC §2 | **ACCEPTED** |
| G1 / D2 | Internal tool; **no legal disclaimer, no blocking gate, no disclaimer-version field**. Keep persistent *non-blocking* operational warnings (experimental, may brick, not hardware-validated, does not flash). | SPEC §2 | **ACCEPTED** |
| D3 / D4 | Both `admin` and `technician` may use experimental patches (with inline acknowledgment + `allowExperimental=true`) and full-dump mode. | SPEC §2 | **ACCEPTED** |
| G2 / D7 | **Option A — pure TypeScript port** inside the Next.js app. No new service, no Python in production. Option B is not authorized; Option C rejected. | SPEC §2, §10 | **ACCEPTED** |
| D8 | Online operation acceptable; v1 requires **no** outbound calls. | SPEC §2 | **ACCEPTED** |
| D9 | Integrate the latest MSS0 coherent-latch experiment (`mss0exp`) for `mi6`/`mi6lite`, both roles. | SPEC §2, §4.7 | **ACCEPTED** |
| G3 | Upstream pin v1.1.6 / `95a8f33…`; never `master`. | SPEC §2 | fixed |
| G4 | Flags `FIRMWARE_PATCHER_ENABLED` + `NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED`, default `false`; both must be true. | SPEC §2 | fixed |
| G6 / G7 | No persistence of firmware; no flashing. | SPEC §2 | fixed |

Remaining operational choices (D5, G5, D6) are in §6.

---

## 2. ADR-001 — Implement the patcher as a pure TypeScript port (Option A)

**Status:** Accepted (G2/D7), 2026-11-07. **Deciders:** product owner + coordinator.

### Context

ScooterBooster needs an in-app tool for staff that detects a Brightway-based scooter firmware and applies the same patches as `bw-patcher` v1.1.6. Upstream is Python: `keystone-engine` (assembler), `capstone` (disassembler), `crcmod`, Streamlit UI. The app is Next.js 16 on Vercel (Node runtime). Firmware must never persist, and the tool must be all-or-nothing and auditable.

What the Python reference actually needs at runtime (verified by reading the pinned tree):

- **Pure data logic:** `find_pattern` (with `None` wildcards), detection scoring (`detect.py`), signature tables, byte patching, CRC-16/CCITT, LKS32 CRC-32, N32 CRC-16 (bit-reversed), EU1 container (header size at `0x0E`, XOR `0xAA`, full-image extract/insert).
- **Assembler (`keystone`)** — narrow use. For the **shipped** Mi6/Mi6 Lite family (`leqi_speed.py`): `movw rX,#imm`, `cmp rX,#imm`, `bne label`, `b label`, `b.w <abs>`, `add.w rX,rX,rX,lsl #2`, `lsls rX,rX,#1`, `and rX,rX,#3`, `ldrb[.w] rX,[rY,#imm]`, `ldr rX,[pc,#imm]` (immediate rewritten afterwards for the literal pool), `strh rX,[rY]`, plus a trailing 4-byte literal word. Other models (not shipped in v1) additionally use `movs`, `mov`, `nop`, `lsls`, `ldr rX,[pc,#imm]`, `cmp #imm`.
- **Disassembler (`capstone`)** — tiny: `get_reg(self.disassembly(2 bytes))` to read the destination register of an existing 2-byte Thumb `ldr`/`mov` in a handful of models (`mi4`, `mi5pro`); the shipped Mi6 family does not use it.

### Decision

Port the pinned reference to **first-party TypeScript** under `src/lib/firmware-patcher/**` (server-only), including a **narrow Thumb-2 encoder** limited to the instruction forms the shipped models need and verified by golden bytes against Keystone. No GPL/native assembler dependency; no WASM/Pyodide; no sidecar.

### Consequences

- (+) One deployable, one runtime, no cold-start of a Python interpreter, no extra infra, trivial rollback via flags.
- (+) Same session/role guards, `withErrorHandling`, rate limit, audit and logging as the rest of the app.
- (+) Deterministic and testable with Vitest; parity against the pinned Python is a **dev/CI-only** harness.
- (−) **Parity risk** is borne by us: the encoder must match Keystone byte-for-byte for every form actually emitted (including `b.w` offset encoding, `movw` imm16 split, label resolution and literal-pool alignment). Mitigation: golden vectors per form (FP-015) + the real-fixture parity harness (FP-006); anything unproven is not shipped (G5).
- (−) Ongoing maintenance: upstream changes are not portable automatically; mitigated by pin + documented update procedure (FP-018).
- (−) Detection/engine code is security-sensitive (parses untrusted bytes): bounded loops (`find_pattern`), 4 MiB cap, no `eval`/dynamic `import()` of user input, static allow-lists (FP-005).

### Alternatives considered

| Option | What | Why rejected / not authorized |
| ------ | ---- | ----------------------------- |
| **B — pinned Python service** | Run `bw-patcher` v1.1.6 in a separate container/function; Next.js calls it | New deployable + network hop; Vercel Node functions can run Python only as a separate runtime with native wheels (`keystone`, `capstone`) and cold starts; adds an outbound call that D8/FP-012 forbid for v1; two systems to secure/monitor; firmware would cross a service boundary. **Not authorized for this run** and not a silent fallback: if Option A cannot reach parity the worker reports a blocker. Remains the documented escape hatch only by explicit owner decision. |
| **C — Pyodide/WASM bundle** | Ship CPython+Pyodide with `keystone`/`capstone` compiled to WASM | Multi-MB bundle and slow cold start on serverless; native `keystone`/`capstone` have no maintained Pyodide builds (we would own the toolchain); hard to bound CPU/memory; poor fit for server-only, 10 s budget. **Rejected for production** (SPEC §2). |
| **A′ — Option A with a third-party JS assembler** (e.g. a Keystone WASM npm package) | Reuse an assembler library | Same licence/supply-chain/bundle concerns as C (Keystone is GPL-2.0 family); SPEC §4.5 forbids adding a GPL/native assembler without licence+security review. A narrow first-party encoder is smaller and testable. |

### No-outbound-call boundary (D8)

Online operation is *allowed* (the app runs on Vercel and talks to Firebase), but the **firmware-patcher feature adds zero outbound network calls**:

- `src/lib/firmware-patcher/**` and `src/app/api/admin/firmware-patcher/**` must not import `fetch`-based clients, `http(s)`, `net`, `dns`, Sentry attachments with bodies, or any SDK that sends firmware or derived bytes anywhere. Allowed server interactions are the existing ones: session verification (Firebase Admin), rate limiter, Firestore audit write (metadata only: hashes, sizes, patch codes), logger.
- Enforce with: (a) a Vitest "forbidden imports" static test over the feature folders (W3/W2), (b) the Python reference and upstream checkout are **never** executed or fetched at runtime; the parity harness is a script run offline by developers/CI, (c) no `new URL(userInput)` / no redirect following, (d) verification step greps the production bundle for the engine to confirm it is server-only (FP-016).
- Telemetry: audit and logs carry hashes/sizes/codes only (G6/FP-010). Sentry gets tags, never request bodies.

### Provenance & licensing notes (facts only; no licensing decision)

- `LICENSE` at the pin is **Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International**; every source file carries an equivalent header ("commercial use prohibited", ShareAlike for adaptations). G0 records the owner's authorization to use it; this ADR does not evaluate it. W1/W2/W3 must nevertheless carry the upstream attribution, licence name/link and an "adapted (ported to TypeScript, changes made)" notice in `PROVENANCE.md` and `docs/firmware-patcher.md` (FP-018), and keep the authorization reference alongside.
- The ShareAlike/NonCommercial terms apply to the *derived port*; whether the port may remain private/proprietary under the owner's authorization is for the owner to confirm in the authorization record. Flagged in the report as an open owner/legal item, not a W0 decision.
- The local checkout `D:\Coding\Firmware disassembling\third_party\bw-patcher` is the ScooterBooster **fork** (`1.1.3.post1`, uncommitted edits) and must not be used as the oracle; use `git archive 95a8f33…`.

---

## 3. Architecture summary (for W1–W4; interfaces owned per SPEC §9)

```text
Browser (staff)                       Next.js server (Node runtime, force-dynamic)
 FirmwarePatcherPanel  --multipart-->  /api/admin/firmware-patcher/detect   POST
 (role from server page)               /api/admin/firmware-patcher/patch    POST  -> octet-stream
                       <--JSON/bin---  /api/admin/firmware-patcher/capabilities GET

 per request: flag check -> assertTrustedOrigin -> requireToolUser (admin|technician)
   -> rate limit -> size/count/empty validation -> detect (TS port of detect.py)
   -> capability matrix validation (static allow-list) -> engine in canonical order
   -> audit (fail-closed, D5 default) -> response with hashes/headers; nothing persisted
```

Layering (SPEC §9 ownership): `types.ts` + `detect.ts` + `capabilities.ts` (W1) → `engine/**`, `assembler/**`, `crc.ts`, `models/**`, MSS0 (W2) → `server/**` + routes + docs (W3) → components + pages + nav (W4).

Design constraints derived from the pinned source (details in `matrix-draft.md` §5):

1. **Canonical order** `sls, sld, slp, dms, fdv, cce, mss, mss0exp, chk, img` is part of the parity contract (Leqi speed patches share one inject block; log names `speed_logic_block` vs `speed_constants_updated` depend on call order).
2. **Numeric semantics:** truncation `int(10*kmh)` on doubles (use `Math.trunc`, never rounding); `mi5plus` uses banker's rounding; values `0` are invalid, not "absent".
3. **All-or-nothing:** run on a copy; any failure → no output; the engine returns an ordered log `{name, offset, before, after}` identically shaped to the Python reference.
4. **`mss0exp`:** apply site writes only if current bytes ∈ {accepted predecessor, already-final}; else reject. Then `chk`, then `img`. Verified exact-site and hash reproduction on real data (fixtures.md §4).
5. **Mi6 variants:** Base has firmware variants V1/V2 in upstream; only **V2** has a real fixture. See G5 in §6.

## 4. Capability matrix & shipping scope (summary)

Full table: `matrix-draft.md`. Introspected from the real pinned classes (11 models × 11 upstream codes + custom `mss0exp`):

- Upstream **experimental** cells at v1.1.6: only `mi6.mss`, `mi6lite.mss`.
- Zero GUI-vs-implementation discrepancies.
- **Shippable now (real fixture):** `mi6` (variant V2), `mi6lite`. All other 9 models: **`do not ship`** (unsupported + hidden) until lawful fixtures + parity exist (SPEC G5).

## 5. Test & parity environment recipe (validated by W0)

| Item | Value |
| ---- | ----- |
| Python | 3.13.15 |
| Packages | `keystone-engine==0.9.2`, `capstone==4.0.2` (pin; `pip install capstone` alone gives 5.x), `crcmod==1.7`, `setuptools>=80,<81` (needed because `capstone 4.0.2` imports `distutils`) |
| Import order | `import setuptools` **before** `import capstone` (distutils shim) |
| Reference | `git archive 95a8f339787a1fb6486554d61b573b8e2b688c53` into a temp dir (`BW_PATCHER_REF`); `bwpatcher/version.py` → `1.1.6` |
| Fixtures | `BW_FIXTURE_DIR=D:\Coding\Firmware disassembling\firmware` (read-only, outside repo) |
| Capture | `patch_firmware` prints to stdout — redirect; normalise result shapes (tuple / list / `None`) |
| Result | W0 reproduced both MSS0 golden hashes with this recipe (fixtures.md §4) |

## 6. Remaining operational choices (smallest decision needed)

| ID | Question | W0 recommendation / default | Smallest decision needed | Blocks |
| -- | -------- | --------------------------- | ------------------------ | ------ |
| **D5** | If the `auditLog` write fails, do we still return the patched binary? | **Fail closed** (no binary) — SPEC default; consistent with "audit every patch". | Confirm default; only if the owner wants availability over auditability record an explicit exception for fail-open. | W3 (route behaviour + tests) |
| **G5** | Which models ship in v1? | Ship exactly **`mi6` (V2 firmware) + `mi6lite`**, the only models with lawful, hashed, parity-checkable fixtures; hide the other 9 as unsupported. For `mi6` V1 firmware: reject with a clear Spanish "variante no soportada" message unless a V1 fixture is supplied. | (a) Confirm the two-model scope; (b) confirm Base **V1** is *unsupported* in v1 (or supply a V1 `.bin`). | W1 (capabilities/ detection fixtures), W2 (scope of port) |
| **D6** | Expose `rfm`/`rsls`? | **No** (match upstream GUI at v1.1.6; they are absent from `app.py`; `rfm` is a no-op for several LKS32 models). | Confirm; none needed if default stands (SPEC table marks ACCEPTED). | W1/W4 |

Non-blocking items for the coordinator/owner (not W0 decisions): authorization reference for G0 text; licence-terms confirmation of ShareAlike/NonCommercial for the private port (see ADR); recording the true origin of the Mi6 fixtures; CI storage for fixtures (`BW_FIXTURE_DIR`) — tests must report `SKIPPED` not `PASS` when absent.

## 7. Next owners

| Next | Inputs from W0 |
| ---- | -------------- |
| **W1** | `matrix-draft.md` (compact JSON + findings), `fixtures.md` §3/§6 (detection vectors incl. the two negative dashboard files), detection constants list (`detect.py`: `LEQI_PRODUCT/SIZE/FAMILY`, `BW_ID`, `NON_PATCHER_LABELS`, `MIN_SCORE=30`) |
| **W2** | `fixtures.md` §4/§5 (golden + reference vectors), ADR instruction list, numeric-semantics notes, env recipe §5 |
| **W3** | ADR no-outbound boundary, D5 default, audit/headers per SPEC §5, note that `docs/firmware-patcher.md` must carry the G0 authorization reference |
| **W4** | Shipping scope (2 models), MSS0 UI rules (SPEC §4.7), experimental list (`mss` for the two models only) |
| **Coordinator** | The three choices in §6 and the open items in `reports/w0-report.md` |
