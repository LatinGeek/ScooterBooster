# Firmware Patcher — Specification v1.0

> **Status:** AUTHORIZED — owner confirmed bw-patcher use, no legal disclaimer, both staff roles, full-dump and online operation. Implementation may proceed; G2 is recorded as Option A and G0/G1 are accepted.
> **Date:** 2026-11-07
> **Repo baseline:** `dec672512e1a91f5ec75dc6ddd576721f0a0a455` (`master`, 2026-11-03, clean tree)
> **Upstream reference:** `scooterteam/bw-patcher` v1.1.6, commit `95a8f339787a1fb6486554d61b573b8e2b688c53` (2026-09-28)
> **Authoritative for:** requirements, acceptance IDs, ownership boundaries and gates.
> **Prompt pack:** [`PROMPT.md`](./PROMPT.md)

---

## 0. How to use this document

1. The coordinator reads this document before dispatching work.
2. Workers receive only their assigned scope plus the requirement IDs they must satisfy.
3. This document is the single source of truth for requirements. Do not restate or reinterpret requirements in worker prompts; reference the IDs.
4. Any change to requirements, gates or ownership is a new version of this file. Prompts reference the version.
5. A task completion, a candidate readiness and a release acceptance are three separate decisions.

### Change log

| Version | Date       | Change                          | Author        |
| ------- | ---------- | ------------------------------- | ------------- |
| 1.0     | 2026-11-07 | Initial specification and gates | Prompt author |

---

## 1. Objective and non-goals

### Objective

Add an internal **Firmware Patcher** for users with the `admin` or `technician` role. It must:

- accept a Brightway-based scooter firmware file (`.bin`);
- auto-detect the scooter model from the firmware header;
- show only model-appropriate patches and safe value ranges;
- apply the selected patches server-side, producing a downloadable patched `.bin`;
- behave equivalently to `bw-patcher` v1.1.6 at the pinned commit for every shipped model/patch;
- fit ScooterBooster's existing Next.js 16 App Router, session/role guards, error handling, rate limiting, audit log and design system;
- never flash, send to third parties or persist firmware beyond the in-memory request.

### Non-goals

- No BLE, USB, serial, OTA or any device flashing/installation. Patching only.
- No Firestore/Storage/disk persistence of uploaded or patched firmware.
- No public, user-role or guest access. No marketing page, no SEO.
- No batch processing, public API, webhook or external client.
- No Xiaomi Cloud login or credential handling; the existing Token Extractor remains separate. A user may download firmware with it and then upload it here.
- No manual model override in v1. A wrong model choice can brick a device; fix detection instead.
- No automatic upstream sync. Pin v1.1.6 and document the update procedure.
- No copying the upstream Streamlit UI, legal text or branding.
- No changes to booking, payment, technician or token-extractor behavior.
- No "unlock speed" marketing claims or legal advice.
- No signature creation or verification. The output is an unofficial modified image; never describe it as signed, official or validated by the manufacturer.

---

## 2. Gates and product decisions

### G0 — Licensing and commercial-use basis — **ACCEPTED**

The owner confirmed on 2026-11-07 that the team has authorization to use `bw-patcher`. Record the authorization reference in the run record and in `docs/firmware-patcher.md`. The upstream pin, attribution and licence notice remain mandatory; do not remove them.

### G1 — Owner legal/safety acceptance — **ACCEPTED, NO DISCLAIMER**

The owner confirmed on 2026-11-07:

- no legal disclaimer is required because this is an internal tool;
- do **not** add a blocking disclaimer gate or a disclaimer-version API field;
- keep clear non-blocking operational warnings: patching is experimental, may brick a device, is not hardware-validated, and does not flash;
- both `admin` and `technician` roles may use experimental patches and full-dump mode;
- v1 does not flash and does not guarantee correct device behaviour.

### G2 — Architecture decision — **ACCEPTED: Option A**

**Option A — pure TypeScript port inside the Next.js app** is selected. No new service and no Python runtime in production. The owner confirmed online operation is acceptable, but v1 does not require outbound network calls.

Fallback **Option B — pinned Python service** is not authorized for this run. If parity cannot be achieved under Option A, the worker must report a blocker; it must not silently switch architecture.

Rejected: **Option C — Pyodide/WASM bundle** for production. Bundle size, cold-start and native `keystone`/`capstone` compatibility make it unsuitable for v1.

### G3 — Upstream pin

- Repository: `https://github.com/scooterteam/bw-patcher`
- Version: **1.1.6**
- Commit: **`95a8f339787a1fb6486554d61b573b8e2b688c53`**
- Reference date: 2026-09-28

Record the pin in code provenance and in every parity report. Never use `master` as an unversioned reference.

### G4 — Feature flag and rollout

- Server flag: `FIRMWARE_PATCHER_ENABLED` (default `false`).
- Public UI flag: `NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED` (default `false`).
- Both must be `true` for the feature to be reachable.
- When off: API returns 404, pages return `notFound()`, nav entries hidden.
- Flag values are not secrets; document them in `.env.example`.
- Enabling in production is a release-acceptance action owned by the product owner, not a worker.

### G5 — Model/patch coverage and shipping rule

Ship a model only when:

- detection is implemented and tested against at least one real firmware fixture for that model/family/variant (including Mi6 v1/v2 variants where upstream supports them);
- every shipped patch has a byte-for-byte parity result against the pinned Python reference;
- the capability matrix is generated and reviewed;
- no partial or "best effort" patch path remains.

If a model cannot meet this, mark it **unsupported** in the matrix and hide it. Do not ship unverified patches.

### G6 — No persistence

Never write firmware bytes to disk, Firestore, Storage, logs, Sentry, analytics or third-party services. Only in-memory `Buffer`/`Uint8Array` handling. Audit metadata may include hashes and sizes, never bytes.

### G7 — No flashing

This feature produces a file. It does not connect to, flash or update a scooter. The UI must say so.

### Decision log

| ID  | Decision                     | Default                                                    | Owner                       | Status   |
| --- | ---------------------------- | ---------------------------------------------------------- | --------------------------- | -------- |
| D1  | Licensing basis              | Owner authorized bw-patcher use (2026-11-07)               | Product owner               | ACCEPTED |
| D2  | Disclaimer                   | No disclaimer required; internal tool                      | Product owner               | ACCEPTED |
| D3  | Experimental patches         | Both roles; explicit inline acknowledgment checkbox        | Product owner               | ACCEPTED |
| D4  | Full-dump mode               | Both roles                                                 | Product owner               | ACCEPTED |
| D5  | Audit failure behaviour      | Fail closed: no binary if audit write fails                | Product owner               | PROPOSED |
| D6  | Expose `rfm`/`rsls` controls | No; match upstream GUI at v1.1.6                           | Product owner               | ACCEPTED |
| D7  | Architecture                 | Option A (pure TS port)                                    | Product owner + coordinator | ACCEPTED |
| D8  | Online operation             | Allowed; v1 makes no outbound calls                        | Product owner               | ACCEPTED |
| D9  | MSS0 experiment              | Latest coherent-latch MSS0 for `mi6`/`mi6lite`, both roles | Product owner               | ACCEPTED |

---

## 3. Roles and access

| Role         | Admin page                | Technician page                          | Stable patches | Experimental patches | Full dump | Capabilities API |
| ------------ | ------------------------- | ---------------------------------------- | -------------- | -------------------- | --------- | ---------------- |
| `admin`      | `/admin/firmware-patcher` | Yes (mirrors token extractor)            | Yes            | Yes                  | Yes       | Yes              |
| `technician` | —                         | `/dashboard/technician/firmware-patcher` | Yes            | Yes                  | Yes       | Yes              |
| `user`       | —                         | —                                        | No             | No                   | No        | 403              |
| anonymous    | —                         | —                                        | No             | No                   | No        | 401              |

- Page guards mirror `src/app/admin/token-extractor/page.tsx` and `src/app/dashboard/technician/token-extractor/page.tsx`.
- API guards use `requireToolUser()` from `src/lib/token-extractor/api.ts` or an equivalent firmware-patcher helper with the same semantics.
- Hiding a nav link is never authorization. Every request re-checks session role.

---

## 4. Upstream behaviour to clone (v1.1.6)

> The README is stale. The authoritative source is the code at the pinned commit.

### 4.1 Patchable models

`bwpatcher/modules` at v1.1.6 exposes these patchable model modules:

| Model code  | Upstream class     | Base patcher                | Typical display                |
| ----------- | ------------------ | --------------------------- | ------------------------------ |
| `mi4`       | `Mi4Patcher`       | LKS32                       | Electric Scooter 42            |
| `mi4lite`   | `Mi4litePatcher`   | LKS32                       | Electric Scooter 4 Lite        |
| `mi4pro2nd` | `Mi4pro2ndPatcher` | ES32                        | Mi 4 Pro 2nd                   |
| `mi5`       | `Mi5Patcher`       | LKS32                       | Mi 5                           |
| `mi5max`    | `Mi5maxPatcher`    | LKS32 (via Mi5)             | Mi 5 Max                       |
| `mi5pro`    | `Mi5proPatcher`    | ES32                        | Mi 5 Pro                       |
| `mi5elite`  | `Mi5elitePatcher`  | N32/Leqi                    | Mi 5 Elite                     |
| `mi5plus`   | `Mi5plusPatcher`   | Core (plaintext full image) | Xiaomi Electric Scooter 5 Plus |
| `mi6`       | `Mi6Patcher`       | N32/Leqi padding            | Mi 6                           |
| `mi6lite`   | `Mi6litePatcher`   | N32/Leqi padding            | Mi 6 Lite                      |
| `ultra4`    | `Ultra4Patcher`    | LKS32                       | Ultra 4                        |

Detection may also recognise non-patchable labels (`3lite`, `6esstl`, `6pro_or_6max`, `mi4lite2`, `t2201`). Those must never be patchable.

### 4.2 User-facing patch controls at v1.1.6

The upstream GUI (`app.py`) exposes these controls. Exact support/experimental flags must be generated from the pinned classes, not assumed from this table.

| Code      | Label                                     | Control                 | Value/range/default              | Model rule                                                                  |
| --------- | ----------------------------------------- | ----------------------- | -------------------------------- | --------------------------------------------------------------------------- |
| `sls`     | Sport speed limit                         | checkbox + slider       | 1.0–35.0, 0.1, default 25.0      | All models                                                                  |
| `sld`     | Drive speed limit                         | checkbox + slider       | 1.0–35.0, 0.1, default 15.0      | All models                                                                  |
| `slp`     | Walk/pedestrian speed limit               | checkbox + slider       | 1.0–35.0, 0.1, default 6.0       | Leqi models only: `mi5elite`, `mi6`, `mi6lite`, `mi5plus`                   |
| `dms`     | Dashboard max speed                       | checkbox + slider       | 1.0–29.6, 0.1, default 22.0      | `mi4`, `ultra4`                                                             |
| `mss`     | Motor start speed                         | checkbox + slider       | 1.0–9.0, 0.1, default 5.0        | All except `mi4`, `mi4lite`, `mi5plus`; experimental on `mi6`/`mi6lite`     |
| `fdv`     | Fake firmware version                     | checkbox + 4-digit text | exactly 4 digits, default `0000` | All except `mi4pro2nd`, `mi5pro`, and Leqi models                           |
| `cce`     | Cruise control enable                     | checkbox                | boolean                          | All except Leqi models                                                      |
| `mss0exp` | MSS0 experimental launch (coherent latch) | checkbox                | boolean, default off             | `mi6`, `mi6lite` only; both roles; overrides the `mss` slider when selected |
| —         | Full dump                                 | checkbox                | boolean, default off             | Both roles (D4); controls whether `chk` is auto-appended                    |
| `chk`     | Fix checksum                              | auto                    | —                                | Appended automatically when **not** full dump                               |
| `img`     | Create full image                         | auto                    | —                                | Appended automatically for Leqi models, including full-dump mode            |

Important upstream semantics:

- `rfm` (region-free) and `rsls` (remove sport speed limit) exist in `patch_map` but are **not** exposed as user controls in `app.py`. Do not add them in v1 (D6).
- For `mi5elite`, `mi6` and `mi6lite` (the `LeqiSpeedPatcher` / `LeqiPaddingSpeedPatcher` subclasses), a speed patch also applies the model's internal region-limit fix. That is part of the speed patch, not a separate checkbox. `mi5plus` has an explicit `region_free()` method but does **not** invoke it from its speed patches, so it must not be presented as an automatic region-free behaviour.
- `chk` must run after all user patches. `img` runs after `chk` for Leqi models.
- In full-dump mode, `chk` is skipped; `img` is still appended for Leqi models.
- The upstream `patch_firmware(..., web=True)` raises on error. The web endpoint must be all-or-nothing: if any selected patch fails, emit no file.
- The upstream CLI may continue after errors (`web=False`); do not copy that behaviour into the web endpoint.
- ScooterBooster may validate invalid inputs more strictly than the upstream GUI (for example, rejecting an FDV value that is not exactly 4 digits instead of silently skipping it). Parity applies to valid selections with the same model, values and options; stricter invalid-input handling is allowed and must be documented.

### 4.3 Canonical patch order

Normalise server-side, regardless of client order:

```text
sls, sld, slp, dms, fdv, cce, mss, mss0exp, chk, img
```

Omit codes that were not selected or that are model-inapplicable. Reject duplicates. `mss0exp` is applied after the normal `mss` patch and before `chk`/`img`; when selected it supersedes the user's `mss` value. `chk` and `img` are server-managed and must not be accepted from the client.

### 4.4 Detection

Port `bwpatcher/detect.py` exactly:

- header window `0x00..0x80`;
- LEQI tags `EU1\0`, `BU1\0`;
- LEQI product/family/size maps;
- BrightWay packaged ID map and 4-character prefixes;
- raw marker scanning (`LKS32MC071CBT8FFP`, `LKS32MC071CBT8FF`, `LKS32MC081`, `SZMC-ES-ZM-0283M`, `SUNWODA`, `DEPRD5C`, `DEPRA3ES`);
- scoring, `MIN_SCORE = 30`, tie/ambiguity handling, notes;
- `ok` only when the best model is a patchable module and not a non-patcher label.

Detection is side-effect free and deterministic. Return diagnostics so a technician can see why a model was selected.

### 4.5 Engine primitives

Port the following at the pinned commit:

- `find_pattern` with `None` wildcards and the same start/stop semantics.
- CRC-16/CCITT: polynomial `0x11021`, init `0`, non-reflected, xorOut `0`, big-endian 2 bytes (`core.py`).
- LKS32 CRC-32: polynomial `0x104C11DB7`, init `0xFFFFFFFF`, non-reflected, pad input with `0xFF` to a multiple of 4, little-endian 4 bytes (`core_lks32.py`).
- N32 CRC-16: polynomial `0x8005`, init `0xFFFF`, input and result bit-reversed, over `[0x40:size-2]`, big-endian 2 bytes (`core_n32.py`).
- N32 EU1 header size field at `0x0E`, body at `0x80`, XOR `0xAA` symmetric encryption/decryption, dynamic size fallback, full-image extract/insert, CRC patch/verify (`core_n32.py`).
- Full/DFU checksum semantics (`core.py`, `core_lks32.py`, `core_es32.py`).
- Thumb instruction encoding and the limited disassembly used by `get_reg`/`extract_ldr_offset`, plus `offset_to_nearest_word`.
- Keystone-equivalent branch/label resolution, literal pools (`ldr rX, =imm`, `ldr rX, [pc, #imm]`), and exact byte output.

Do not introduce a GPL/native assembler dependency without a licence and security review. Prefer a first-party, narrowly scoped Thumb encoder with golden tests.

### 4.6 Capability matrix

Generate `src/lib/firmware-patcher/capabilities.ts` from the pinned Python classes (introspection), not from the README or this table. It must include for every model × patch:

- `supported | experimental | unsupported`;
- value kind (`number`, `boolean`, `version`);
- min/max/step/default;
- role restrictions (both staff roles may use experimental and full dump in this run);
- provenance comment with upstream commit SHA and generation command.

The generated matrix is authoritative for upstream patches. Extend it with the custom `mss0exp` entry in §4.7.

### 4.7 MSS0 experimental patch — latest coherent-latch experiment

This is a **ScooterBooster custom experimental patch**, not an upstream v1.1.6 patch. It integrates the latest MSS0 experiment from `D:\Coding\Firmware disassembling` (read-only reference; do not copy firmware binaries into the repo).

- Patch code: **`mss0exp`**.
- Label: **MSS0 experimental launch (coherent latch)**.
- Models: **`mi6`** and **`mi6lite`** only.
- Roles: both `admin` and `technician`.
- Default: off. Selecting it requires an inline acknowledgment checkbox; it is experimental and not physically validated.
- Interaction: it supersedes the normal `mss` value for these models. The UI should disable/lock the MSS slider while selected; the server must ignore any client-supplied `mss` value and apply `mss0exp` as the complete MSS0 patch.
- Order: after normal speed/region patches, before `chk`/`img`.

**Base (`mi6`) final body bytes** (decoded, XOR `0xAA` body; file offset = body + `0x80`):

| Body offset | Final bytes | Meaning                              |
| ----------- | ----------- | ------------------------------------ |
| `0x18EC`    | `0029`      | `cmp r1,#0` primary enable threshold |
| `0x18F2`    | `03db`      | `blt` inclusive enable branch        |
| `0x1D20`    | `01f10a05`  | `add.w r5,r1,#10`                    |
| `0x1D28`    | `a026`      | `movs r6,#160`                       |
| `0x1F30`    | `0029`      | `cmp r1,#0` ramp gate                |
| `0x1F32`    | `bff6f3ae`  | `bge.w` inclusive ramp branch        |
| `0x7A20`    | `0020`      | `movs r0,#0` latch release threshold |
| `0x7A2A`    | `002b`      | `cmp r3,#0` latch rearm threshold    |

**Lite (`mi6lite`) final body bytes**:

| Body offset | Final bytes | Meaning                             |
| ----------- | ----------- | ----------------------------------- |
| `0x7DC6`    | `002d`      | `cmp r5,#0` latch release threshold |
| `0x7DCE`    | `002d`      | `cmp r5,#0` latch rearm threshold   |
| `0x217E`    | `002a`      | `cmp r2,#0` ramp gate               |
| `0x2180`    | `6edb`      | `blt` inclusive ramp branch         |
| `0x2186`    | `02f10a05`  | `add.w r5,r2,#10`                   |
| `0x218E`    | `a026`      | `movs r6,#160`                      |

Requirements:

- Validate the model and the current bytes at each site before writing. Accept either the known stock/MSS0 predecessor state or the already-patched state; reject any other bytes with a clear error.
- Apply all writes to the decoded body, then re-encrypt and recompute the N32 CRC via the existing `chk`/N32 finalization path. Do not hand-maintain CRC bytes.
- Preserve the rest of the image byte-for-byte except the listed sites and the CRC.
- The 1/16 launch curve is `trunc(q * (speed_x10 + 10) / 160)` for `0..150`; the upper branch remains unchanged. This is an experimental calibration, not a manufacturer value.
- Golden references (must pass before shipping):
  - Base factory: `firmware/original/mi6-base/7e6e02cafdf7d70171d0e9ed01705a85_mcu_xiaomi.scooter.6 (1).bin`, SHA-256 `31362a4863d3430fdd90812fe175a4b37e9f426207ce804afeeba0f6432e4a2b`.
  - Base output with `sls=35,sld=25,slp=15,mss0exp`: `firmware/patched/patched_mi6_firmware_mss0_15-25-35_coherent_latch_experimental.bin`, SHA-256 `7a66169940c538eb3310136a5affa99d588c5a2c2d11b8e0ec5bedabc1c8d747`.
  - Lite factory: `firmware/original/mi6-lite/mcu_xiaomi.scooter.6lite_factory.bin`, SHA-256 `83d3d3c05cce80be5d0f1e42046b9b792423beec2d5e6e96af873d8c5c3a4d7d`.
  - Lite output with `sls=35,sld=25,slp=15,mss0exp`: `firmware/patched/patched_mi6lite_firmware_mss0_15-25-35_coherent_latch_experimental.bin`, SHA-256 `98f12702b11024472749f76d6305d32f99456babe740ea3cbf2fe1fecf0150db`.
  - Intermediate Base input for reference: `firmware/patched/patched_mi6_firmware_mss0_15-25-35_rampfix_upstream-95a8f33.bin`, SHA-256 `a4807a8fcb2bdb3265ca215fc23538e6040ab15b5ff0676c1aa3d6ffbeab83cb`.
  - Intermediate Lite input for reference: `firmware/patched/patched_mi6lite_firmware.bin`, SHA-256 `12b6951615c41adc6f9a0a4316c9dc31e66455a075c48fb54d427eb6427c3dcd`.
- Reference evidence: `docs/research/mi6-base-mss0-inclusive.md`, `mi6-base-mss0-launch.md`, `mi6-base-mss0-coherent-latch.md`, `mi6-lite-15-25-35-mss0-coherent-latch.md`, and their JSON files.
- If the golden output hash differs, stop and report a parity failure. Do not "fix" by changing the reference.

---

## 5. Requirements

### FP-001 — Access control

- Both pages and every API route require `admin` or `technician`.
- Anonymous: 401. Other roles: 403.
- Server-side role check on every request; never trust a role query/body/header.
- Page redirects follow existing token-extractor patterns.
- Acceptance: route tests cover anonymous, user, technician and admin; page tests cover redirects.

### FP-002 — Feature flag

- `FIRMWARE_PATCHER_ENABLED` and `NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED` gate the feature.
- If **either** flag is off: API returns 404, pages return `notFound()` (including direct URLs), nav entries are hidden.
- Document both in `.env.example`.
- Acceptance: tests with flag off/on; build contains no client-side engine code.

### FP-003 — Upload validation

- Exactly one `.bin` file; max **4 MiB** (4,194,304 bytes); non-empty.
- Reject multiple files, oversized bodies (413), and empty files with Spanish messages.
- Sanitize filename by stripping path separators and control characters, limiting length (e.g. 120 chars) and falling back to `firmware.bin`; never use it as a path or reflect it as HTML.
- Check `Content-Length` and `File.size` before reading the full body where possible.
- Do not trust `Content-Type`; detection/header parsing is authoritative.
- Reject known non-firmware inputs with a clear "no se pudo detectar el modelo" message.
- Acceptance: unit/API tests for size, count, empty, malformed and valid files.

### FP-004 — Detection parity

- Implement FP-004 behavior from §4.4.
- Return model code, display name, family, container, score/hits/notes and `supported`.
- Never patch when `ok=false`, the model is not in the matrix, or the model is non-patchable.
- Acceptance: golden detection vectors for LEQI, packaged BrightWay, raw markers, ties, unsupported and truncated inputs; byte-for-byte parity with the Python reference where fixtures exist.

### FP-005 — Capability matrix

- Generate and review the matrix per §4.6.
- UI and server validation both read the same matrix.
- Unknown model/patch/value => 400; no fallback, no silent clamp except upstream-defined clamps.
- Model and patch dispatch use static allowlist maps; never `import()` or evaluate a user-controlled model/patch string.
- `chk`/`img` are not client-selectable.
- Acceptance: every model/patch combination has a test; unsupported combinations rejected.

### FP-006 — Patch engine parity

- Implement every shipped model module and shared core at the pinned commit.
- Implement all primitives in §4.5.
- Output must match the Python reference byte-for-byte for the same input, model and patch list: same output SHA-256 and same ordered patch log (`name`, `offset`, `before`, `after`).
- All-or-nothing on failure.
- Deterministic/idempotent for the same input and options.
- Output filename `patched_<model>_<safe-original-name>.bin`.
- Acceptance: parity harness PASS for every shipped model/patch; golden vectors in `npm test`.

### FP-007 — Experimental patches

- Matrix marks experimental patches.
- Both `admin` and `technician` may request experimental patches (D3).
- The UI requires an explicit inline acknowledgment checkbox (not a legal disclaimer) before applying an experimental selection; it is not pre-checked.
- The server requires `allowExperimental=true` for any experimental selection; a query parameter alone never enables it. Audit records `experimental: true`.
- Show a clear non-blocking warning when an experimental patch is selected: unvalidated on hardware, may not start under load, may brick.
- Acceptance: server tests for both roles with/without `allowExperimental`; UI tests for acknowledgment/warning.

### FP-008 — Full-dump mode

- Available to both `admin` and `technician` (D4).
- When enabled, skip auto-`chk`; still append `img` for Leqi.
- Warn in UI that checksum behaviour differs.
- Audit `fullDump: true`.
- Acceptance: tests for normal vs full-dump patch lists and checksum behavior.

### FP-009 — Operational warnings (no legal disclaimer)

- Do **not** add a blocking legal disclaimer, disclaimer-version field or acceptance timestamp (D2).
- Show a persistent non-blocking note: internal tool, experimental patches are unvalidated on hardware, patching may brick a device, and this tool does not flash.
- Do not copy upstream legal text; attribution/licence notice remains in docs.
- Acceptance: component test confirms the warning is visible and non-blocking; no disclaimer gate exists.

### FP-010 — Audit and observability

- Success: `firmware_patch_applied` with `actorUid`, `targetType: "firmware"`, metadata: model, family, container, patch codes, experimental, fullDump, input/output SHA-256, sizes, durationMs.
- Rejection/failure: `firmware_patch_rejected` / `firmware_patch_failed` with a safe reason category; no stack, no bytes, no secrets.
- Audit write failure: default fail-closed (D5); owner may approve fail-open with an explicit exception.
- Structured logs: requestId, uid, role, model, patch count, duration, outcome. Never log firmware bytes, tokens, credentials or raw multipart bodies.
- Sentry: capture unexpected errors with tags; never attach request bodies.
- Acceptance: route tests assert audit calls and absence of binary data; log inspection in verification.

### FP-011 — Rate limits and resource bounds

- Add `firmwarePatch` (10/min/user) and `firmwarePatchDaily` (100/day/user) policies to `src/lib/ratelimit.ts`, or an equivalent documented policy.
- Max 4 MiB input, 8 MiB output, 8 user patches, `maxDuration = 10` (verify against the deployed platform limit; lower if the platform requires it).
- Reject oversized/concurrent work before allocating large buffers where possible.
- 429/413 with Spanish messages.
- Acceptance: rate-limit tests, size tests, a load/benchmark check.

### FP-012 — API contract

All routes are under `/api/admin/firmware-patcher` and use `assertTrustedOrigin` on POST, `withErrorHandling`, Node runtime and `dynamic = "force-dynamic"`.

| Method | Route           | Purpose                                                                        |
| ------ | --------------- | ------------------------------------------------------------------------------ |
| `GET`  | `/capabilities` | Enabled state, upstream pin, limits, model/patch matrix                        |
| `POST` | `/detect`       | Multipart `file`; returns detection + available patches                        |
| `POST` | `/patch`        | Multipart `file`, `selection`, `allowExperimental`, `fullDump`; returns binary |

`/patch` response:

- `Content-Type: application/octet-stream`
- `Content-Disposition: attachment; filename="..."` (sanitized)
- `Content-Length`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`
- `X-Firmware-Model`, `X-Firmware-Input-Sha256`, `X-Firmware-Output-Sha256`, `X-Firmware-Input-Size`, `X-Firmware-Output-Size`
- `X-Firmware-Patch-Log`: base64url-encoded JSON array of patch operations, bounded to 4 KiB; if larger, omit and set `X-Firmware-Patch-Log-Truncated: 1`.

Rules:

- Re-detect server-side; never accept a client-supplied model.
- Validate selection against the matrix and ranges; reject unknown/duplicate/auto-managed codes.
- Return JSON errors consistent with `ApiResponse`; no partial binary.
- `selection` is JSON with `{code, value}` entries; `value` type depends on the matrix. `mss0exp` is boolean and, when present, supersedes any `mss` value.
- `allowExperimental` and `fullDump` are parsed strictly (`"true"`/`"false"`), not truthy strings.
- No outbound network calls.
- Acceptance: contract tests for every status/header/error case.

### FP-013 — UI/UX

- Pages: `/admin/firmware-patcher` and `/dashboard/technician/firmware-patcher`.
- Both pages: `dynamic = "force-dynamic"`, `robots: { index: false, follow: false }`, metadata title.
- Shared client component `FirmwarePatcherPanel` receives `role` from the server page.
- Spanish (es-UY) user-facing text; English code/comments.
- Visual language: existing `Card`, `Button`, `Badge`, `Input`, `Label`, `Tabs`, `Dialog`, `#10b981`/`#059669` palette, rounded-xl borders, existing typography.
- Sections: header/badge, persistent operational warning, upload dropzone, detection card, patch form, result card, limitations note. No disclaimer gate.
- Upload: drag/drop + browse, keyboard accessible, shows filename/size, analyse button.
- Detection: model display name/code, family/container, reasons, warnings, unsupported state.
- Patch form: grouped speed/other patches, slider + numeric input, model-specific availability, experimental badge + acknowledgment checkbox, full-dump switch for both roles, MSS0 experimental checkbox for `mi6`/`mi6lite`, defaults/ranges from capability API.
- Result: model, input/output SHA-256, sizes, patch table, download button, "patch another" action.
- Errors: inline + toast; actionable Spanish messages; never show stack traces.
- State: no firmware in localStorage/sessionStorage; clearing the file resets results; AbortController for in-flight requests.
- Accessibility: labels, `aria-live`, focus management, keyboard file input, 44px targets, contrast, reduced motion.
- Responsive: 375px, 768px, 1280px; no horizontal page scroll; patch table scrolls within its container.
- Nav: add "Parcheador" (`Cpu`) to admin and technician layouts; hide when either flag is off.
- Acceptance: component tests + screenshots at the three widths + keyboard/focus check.

### FP-014 — Documentation

Create `docs/firmware-patcher.md` (Spanish operator-facing, with technical sections):

- purpose, access, operational warnings, licensing/attribution;
- supported models and generated patch matrix;
- detection, API, security, limits;
- testing and parity evidence;
- operations: flags, rollout, rollback, monitoring;
- known limitations and non-goals.

Add env vars to `.env.example`. Link from existing docs if a docs index exists.

### FP-015 — Testing and parity evidence

- Unit tests co-located as `*.test.ts`/`*.test.tsx`.
- Detection tests per family and ambiguity case.
- Engine golden vectors per shipped model and patch; at least one N32 encrypted/full-image case.
- MSS0 experimental golden vectors for `mi6` and `mi6lite`: exact final bytes at every listed site, reference output SHA-256, CRC, and idempotency.
- Assembler golden bytes for every instruction form used, including branch boundaries and literal-pool alignment.
- CRC golden vectors cross-checked with Python.
- Parity harness: `scripts/firmware-parity.ts` (or `.mjs`) compares TS vs Python reference at the pinned SHA: detection, ordered patch log, output SHA-256. Writes a JSON report. Requires `BW_PATCHER_REF` and fixtures; never commits real firmware or secrets. If Python/deps are unavailable, parity is **UNVERIFIED**, not PASS.
- Route tests: role matrix, origin, flag, size, malformed multipart, unsupported model, unknown patch, experimental, full dump, audit, rate limit, headers, no persistence.
- Component tests: operational warning (non-blocking), upload, detection states, patch availability, experimental acknowledgment, full-dump switch, MSS0 checkbox, success/error, download filename, accessibility.
- E2E: admin and technician happy path with a fixture; unauthorized redirect; experimental visibility; download assertion; 375px visual check.
- Commands: `npm run type-check`, `npm run lint`, `npm test`, `npm run build`, targeted `npx playwright test <spec>`, `npm run test:rules` only if rules change.
- Preserve baseline failures; do not weaken or delete tests to obtain green.
- Acceptance: evidence lists exact commands, exits, counts, durations, candidate SHA, fixture SHA-256 and upstream SHA.

### FP-016 — Performance

- Detection p95 ≤ 150 ms for a 1 MiB file on the validation host.
- Patch p95 ≤ 1.5 s for a 1 MiB file and 8 patches on the validation host.
- No request > 10 s; no > 256 MiB incremental memory for a 4 MiB input.
- Server-only engine code; verify it does not enter the client bundle.
- Acceptance: benchmark evidence; build bundle inspection.

### FP-017 — Deployment and rollback

- No Firestore rules changes expected (`auditLog` is already server-only). If rules change, update tests.
- Vercel Node runtime; confirm body-size and duration limits for the deployed plan.
- Env vars documented; no secrets added.
- Rollback: set both flags to `false`; no data cleanup required.
- Monitoring: query for `firmware_patch_*`; alert on failure rate and 5xx.
- Acceptance: deployment checklist with flag-off and flag-on smoke tests.

### FP-018 — Provenance and upstream updates

- Record upstream version/commit/licence in `src/lib/firmware-patcher/PROVENANCE.md` and `docs/firmware-patcher.md`.
- Document the update procedure: review upstream diff, re-check licence, regenerate matrix, re-run parity, re-verify.
- No automatic upstream sync.
- Acceptance: provenance file exists; update procedure reviewed.

### FP-019 — MSS0 experimental integration

- Implement `mss0exp` exactly as specified in §4.7 for `mi6` and `mi6lite`, available to both roles.
- It applies after normal speed/region patches and before `chk`/`img`; it supersedes the normal `mss` value.
- Validate final bytes and model; reject unsupported states.
- Golden output hashes for Base/Lite must match; CRC must be valid; all other bytes must remain identical.
- The UI shows the MSS0 checkbox only for `mi6`/`mi6lite`, with an experimental acknowledgment and a non-blocking warning.
- Audit `mss0exp: true` and `experimental: true`.
- Acceptance: exact-byte test, golden hash test, idempotency, CRC, interaction with `mss`, API/UI tests.

---

## 6. Threat model (summary)

| Risk                                                             | Control                                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Malicious/corrupt firmware causes parser crash or CPU exhaustion | Size cap, bounded `find_pattern`, timeouts, no code execution, fuzz/property tests |
| Staff uses dangerous/experimental patch                          | Explicit acknowledgment, warning, audit, both roles allowed by owner decision      |
| Wrong model bricks device                                        | Server-side re-detection, no manual override, unsupported models blocked           |
| Firmware leaks through storage/logs                              | No persistence, no body logging, no Sentry bodies, metadata-only audit             |
| CSRF                                                             | `assertTrustedOrigin` on all POSTs                                                 |
| Rate-limit/DoS                                                   | Per-user limits, patch/file caps, `maxDuration`                                    |
| XSS via filename                                                 | React escaping, sanitize filename, no `dangerouslySetInnerHTML`                    |
| SSRF                                                             | No outbound requests                                                               |
| Supply-chain/licence                                             | Prefer first-party encoder; review any new dependency for licence/security         |
| Audit outage                                                     | Fail-closed default (D5)                                                           |

---

## 7. Baseline environment and known failures

Recorded on 2026-11-07 on the prompt-author host. W0 must re-verify before fan-out.

| Item                 | Value                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| OS/shell             | Windows 11, PowerShell 7.x                                                                          |
| Repo                 | `D:\Coding\ScooterBooster`                                                                          |
| Branch / HEAD        | `master` / `dec672512e1a91f5ec75dc6ddd576721f0a0a455`                                               |
| Working tree         | Clean                                                                                               |
| Node / npm           | `v22.23.3` / `10.9.9`                                                                               |
| Next / React / TS    | `16.2.4` / `19.2.4` / `5.x`                                                                         |
| Vitest / Playwright  | `4.1.4` / `1.59.1`                                                                                  |
| Python               | `3.13.15` (also `3.14.4` via `py`); `keystone`, `capstone`, `crcmod` **not installed**              |
| `npm run type-check` | **PASS** (no output)                                                                                |
| `npm run build`      | **PASS** (Next 16.2.4, 28.0 s compile, 38 static pages)                                             |
| `npm run lint`       | **FAIL** — 14 errors, 5 warnings, all pre-existing in unrelated files                               |
| `npm test`           | **FAIL** — 2 tests in `src/lib/uruguay-locations.test.ts` (Malvín); 68/69 files, 251/253 tests pass |
| `npm run test:rules` | Not run; no rules changes expected                                                                  |
| `npm run test:e2e`   | Not run during prompt preparation; mark UNVERIFIED until W0 runs it                                 |

**Baseline failure policy:** the two failing tests and the lint errors are pre-existing and unrelated. Do not fix them inside this feature unless separately authorized. New/changed files must add **zero** new lint errors and **zero** new test failures. Record the baseline failure in every candidate report.

### Parity environment

- Create a disposable Python venv outside the repo or in a gitignored directory, e.g. `.venv-bw-patcher/`.
- Install the pinned upstream reference (or its dependencies) there; never use production credentials.
- If `keystone-engine` cannot install on the available Python, record the exact error and mark parity **UNVERIFIED**. Do not substitute a different assembler and claim parity.
- The reference checkout must be at `95a8f339787a1fb6486554d61b573b8e2b688c53`; record `git rev-parse HEAD`.

---

## 8. Verification and acceptance matrix

Statuses: **PASS**, **FAIL**, **BLOCKED**, **UNVERIFIED**, **ACCEPTED EXCEPTION**.

| ID     | Gate                 | Verification                | Required evidence          | Status     |
| ------ | -------------------- | --------------------------- | -------------------------- | ---------- |
| G0     | Licensing basis      | Owner record + docs         | Approver, date, basis      | ACCEPTED   |
| G1     | Safety/no disclaimer | Owner record + UI warning   | Warning visible, no gate   | ACCEPTED   |
| G2     | Architecture ADR     | Recorded decision           | Option A recorded          | ACCEPTED   |
| FP-001 | Access               | Route/page tests            | 401/403/200 matrix         | UNVERIFIED |
| FP-002 | Feature flag         | Tests + build               | Off/on evidence            | UNVERIFIED |
| FP-003 | Upload validation    | Unit/API tests              | size/count/empty cases     | UNVERIFIED |
| FP-004 | Detection parity     | Golden + parity harness     | fixture SHAs, report       | UNVERIFIED |
| FP-005 | Capability matrix    | Generated file + review     | provenance, full matrix    | UNVERIFIED |
| FP-006 | Engine parity        | Byte-for-byte report        | output SHA + patch log     | UNVERIFIED |
| FP-007 | Experimental         | Route/UI tests              | both roles, acknowledgment | UNVERIFIED |
| FP-008 | Full dump            | Route/UI tests              | both roles, normal/full    | UNVERIFIED |
| FP-009 | Warnings             | Component test              | non-blocking warning       | UNVERIFIED |
| FP-010 | Audit                | Route tests + logs          | success/failure entries    | UNVERIFIED |
| FP-011 | Limits               | Tests + benchmark           | 413/429, timings           | UNVERIFIED |
| FP-012 | API contract         | Contract tests              | status/headers/errors      | UNVERIFIED |
| FP-013 | UI/UX                | Component + visual          | 375/768/1280 captures      | UNVERIFIED |
| FP-014 | Docs                 | Review                      | docs path                  | UNVERIFIED |
| FP-015 | Tests                | Commands                    | exits/counts/durations     | UNVERIFIED |
| FP-016 | Performance          | Benchmark                   | p95, memory                | UNVERIFIED |
| FP-017 | Deployment           | Checklist                   | flag-off/on smoke          | UNVERIFIED |
| FP-018 | Provenance           | Review                      | pin/licence/update doc     | UNVERIFIED |
| FP-019 | MSS0 experiment      | Golden hashes + exact bytes | Base/Lite outputs, CRC     | UNVERIFIED |

**Candidate readiness** requires all mandatory FP gates PASS (or explicitly accepted exceptions), G0/G1/G2 recorded, and parity PASS for every shipped model/patch including `mss0exp`. **Release acceptance** additionally requires the product owner's approval and a rollout/monitoring plan.

---

## 9. Workstreams and ownership

| Workstream | Role                        | Owned writes                                                                                                                                                | Depends on              | Deliverable                                                      |
| ---------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| W0         | Plan/ADR (read-only + docs) | `docs/firmware-patcher-design.md`, fixture manifest                                                                                                         | None                    | Decisions, matrix draft, environment recipe, fixture/corpus plan |
| W1         | Detection/capabilities      | `src/lib/firmware-patcher/detect.ts`, `capabilities.ts`, `types.ts`, `PROVENANCE.md`, tests                                                                 | W0                      | Detection + matrix + types                                       |
| W2         | Engine/parity + MSS0        | `src/lib/firmware-patcher/engine/**`, `assembler/**`, `crc.ts`, `models/**`, `scripts/firmware-parity.*`, MSS0 integration/tests                            | W1 types/matrix         | Patch engine + parity harness + `mss0exp`                        |
| W3         | API/security/docs           | `src/app/api/admin/firmware-patcher/**`, `src/lib/firmware-patcher/server/**`, `src/lib/ratelimit.ts` hunk, `docs/firmware-patcher.md`, `.env.example` hunk | W2 API                  | Routes, validation, audit, docs                                  |
| W4         | UI                          | `src/components/firmware-patcher/**`, both pages, nav layout hunks, UI tests                                                                                | W3 contract (mockable)  | Accessible pages + client flow                                   |
| W5         | Verifier                    | Isolated report/captures only                                                                                                                               | W4 integrated candidate | Independent verification report                                  |
| W6         | Integrator                  | Authorized integration only                                                                                                                                 | W1-W4 manifests         | Integrated candidate + applied/blocked report                    |
| W7         | Supervisor/final verifier   | Reports + authorized integration only; starts last                                                                                                          | W1-W6                   | Final verification report + integrated candidate                 |

### File ownership rules

- One writer per worktree and per shared file/hunk at a time.
- W1 owns `types.ts`; W2 consumes it read-only. Interface changes go through W1 or an explicit ownership transfer.
- W3 owns `src/lib/ratelimit.ts`; no other worker edits that file.
- W4 owns both nav layout edits (admin and technician) to avoid a shared-hunk collision.
- W3 owns `docs/firmware-patcher.md`; W4 supplies UI content in its handoff, W3 applies it.
- W3 owns `.env.example`; W4 does not edit it.
- W5 writes only reports/captures/temp artifacts.
- The coordinator never edits deliverables, Git history or deployment.

---

## 10. Resolved owner decisions and remaining operational choices

Resolved on 2026-11-07:

1. **G0:** Owner authorized bw-patcher use.
2. **G1/D2:** No legal disclaimer; internal tool.
3. **D3/D4:** Both `admin` and `technician` may use experimental patches and full-dump mode.
4. **D7:** Option A (pure TypeScript port).
5. **D8:** Online operation allowed; v1 still makes no outbound calls.
6. **D9:** Integrate the latest MSS0 coherent-latch experiment for `mi6`/`mi6lite`.

Remaining choices (coordinator/worker may decide, record in the run):

- **D5:** Audit failure behaviour; default fail-closed.
- **G5:** Which models have lawful real fixtures in this run. Models without fixtures stay unsupported.
- **D6:** Keep `rfm`/`rsls` hidden (matches upstream GUI).

Workers must not ask the user directly; route any new product decision through the coordinator.

---

## 11. Known limitations and risks

- **Attribution risk:** authorization is recorded; preserve the upstream pin, licence notice and provenance. Do not strip attribution.
- **Parity risk:** the Python assembler (`keystone`) has no exact TypeScript equivalent by default; a narrow encoder plus golden tests is required.
- **Fixture risk:** real firmware may not be redistributable; keep it outside the repo, record hashes/provenance, and never commit it without permission.
- **Detection risk:** header ambiguity can misidentify a model; no manual override in v1; diagnostics must be visible.
- **Safety risk:** patching can brick devices; experimental patches require acknowledgment and audit, but no software control eliminates the risk. The MSS0 experiment is not physically validated.
- **Maintenance risk:** upstream changes are not automatically portable; pin and re-verify.
- **Platform risk:** Vercel request-body and duration limits may constrain large full dumps; verify and document.
- **Test-oracle risk:** do not exclude failing cases, relax assertions or delete baseline failures to obtain green.
