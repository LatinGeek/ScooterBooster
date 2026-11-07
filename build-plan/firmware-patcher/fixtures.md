# Firmware Patcher — fixture corpus & provenance manifest (W0 draft)

> **Run:** FP-PLAN (W0) · **Date:** 2026-11-07 · **Upstream pin:** bw-patcher v1.1.6 `95a8f339787a1fb6486554d61b573b8e2b688c53`
> **Consumers:** W1 (detection vectors), W2 (parity + MSS0 golden), W5/W7 (verification).
> **Rule (SPEC G5/G6/§11):** real firmware stays **outside the repo**. Only hashes, sizes, offsets and derived expectations are committed. A test that needs a real file must **skip with a visible `SKIPPED (no fixture)` status — never pass vacuously.**

## 1. Storage & access

| Item | Value |
| ---- | ----- |
| Fixture root (read-only reference workspace) | `D:\Coding\Firmware disassembling\firmware\` |
| Env contract for tests/harness | `BW_FIXTURE_DIR` = fixture root above; `BW_PATCHER_REF` = a `git archive 95a8f33…` export of upstream (never the fork checkout) |
| In-repo location | **none.** `.gitignore` must keep `*.bin` fixtures out; W2 owns a guard test asserting no `*.bin` under the repo tracked files |
| Copies made by W0 | **none** (W0 only read + hashed; scratch outputs live in the session scratchpad, outside the repo, no firmware copied into the worktree) |
| Hash verification | every harness run re-hashes inputs against §3 and aborts on mismatch |

Disk note: the reference workspace is on `D:`; the dev host `C:` ran out of space during W0 (see `reports/w0-report.md`). Keep scratch outputs minimal and outside the repo.

## 2. Provenance & redistribution status (all real fixtures)

| Fact | Status |
| ---- | ------ |
| Origin | "Canonical, unchanged inputs received by the project" (`firmware/ARTIFACT_CATALOG.md`). Filenames follow the Xiaomi OTA pattern `<32-hex>_mcu_xiaomi.scooter.6[lite].bin`. **The exact download origin/URL/date is not recorded** → provenance gap; owner should add it to the manifest. |
| Licence / redistribution | Proprietary vendor firmware (Xiaomi / Brightway). **No redistribution right is on record** → treat as **NOT redistributable. Do not commit, do not attach to PRs/CI artifacts, do not upload to any service.** |
| Derived/patched outputs | Also treated as non-redistributable (derivative of vendor binaries), including the MSS0 golden outputs. |
| Allowed in repo | SHA-256 values, byte sizes, offset tables, expected ordered patch logs (`name/offset/before/after` hex ≤ 16 bytes per entry — to be reviewed by W2/W7 for redistribution risk before committing), expected detection JSON, synthetic generated images (see §6). |
| Hardware validation | **None** for any file here. Golden outputs are *static* reproductions, not a statement that a scooter works. |
| Catalog drift | `ARTIFACT_CATALOG.md` / `manifests/SHA256SUMS.txt` list canonical names (`original/mi6-base/mcu_xiaomi.scooter.6_factory.bin`, `patched/mi6-base/candidate/…`) that **do not exist on this host**; the same content lives under the OTA-style names below (the hashes match the manifest). Use the paths and hashes in §3, not the catalog paths. |

## 3. Real fixtures present on this host (all hashes re-computed by W0 on 2026-11-07)

| ID | Role | Path (under `BW_FIXTURE_DIR`) | Size (B) | SHA-256 | Reference detection (pinned Python) |
| -- | ---- | ----------------------------- | -------- | ------- | ----------------------------------- |
| `MI6-BASE-FACTORY` | Golden input (Base) | `original/mi6-base/7e6e02cafdf7d70171d0e9ed01705a85_mcu_xiaomi.scooter.6 (1).bin` | 148108 | `31362a4863d3430fdd90812fe175a4b37e9f426207ce804afeeba0f6432e4a2b` | `best=mi6 ok=true family=leqi container=eu1`; `Mi6Patcher._fw_variant = v2` |
| `MI6-BASE-GOLDEN-OUT` | Golden output (Base) | `patched/patched_mi6_firmware_mss0_15-25-35_coherent_latch_experimental.bin` | 148108 | `7a66169940c538eb3310136a5affa99d588c5a2c2d11b8e0ec5bedabc1c8d747` | — |
| `MI6-BASE-INTERMEDIATE` | Reference only | `patched/patched_mi6_firmware_mss0_15-25-35_rampfix_upstream-95a8f33.bin` | 148108 | `a4807a8fcb2bdb3265ca215fc23538e6040ab15b5ff0676c1aa3d6ffbeab83cb` | — |
| `MI6-LITE-FACTORY` | Golden input (Lite) | `original/mi6-lite/mcu_xiaomi.scooter.6lite_factory.bin` | 81096 | `83d3d3c05cce80be5d0f1e42046b9b792423beec2d5e6e96af873d8c5c3a4d7d` | `best=mi6lite ok=true family=leqi container=eu1` |
| `MI6-LITE-GOLDEN-OUT` | Golden output (Lite) | `patched/patched_mi6lite_firmware_mss0_15-25-35_coherent_latch_experimental.bin` | 81096 | `98f12702b11024472749f76d6305d32f99456babe740ea3cbf2fe1fecf0150db` | — |
| `MI6-LITE-INTERMEDIATE` | Reference only | `patched/patched_mi6lite_firmware.bin` | 81096 | `12b6951615c41adc6f9a0a4316c9dc31e66455a075c48fb54d427eb6427c3dcd` | — |
| `MI6-BASE-DASHBOARD` | **Negative** detection vector | `original/mi6-base/f94a863d5183d1d94c00f8e8ca1679ce_upd_xiaomi.scooter.6 (1).bin` | 151160 | `c0df252e66bfeeb3cc0b274b47de91da2f4458ebed66a431a408d6b47ca0cc68` | `best=null ok=false` ("no recognizable header in [0x00, 0x80)") |
| `MI6-LITE-DASHBOARD` | **Negative** detection vector | `original/mi6-lite/dashboard_xiaomi.scooter.6lite_factory.bin` | 150360 | `98854d04d000c84e5268d15ea5b6ddb8b29465bfd0f8187f92fd36cbf9f4ec87` | `best=null ok=false` (same note) |

All six hashes quoted in SPEC §4.7 match the files byte-for-byte (SHA-256 recomputed; all 64-hex).

Other files on the host that are **not** fixtures: `.codex-remote-attachments/…/1-mi-6-max.bin` (16,777,216 B flash dump, sha256 `c7c995d1…0c57`, reference detection `ok=false`; useful only as an **oversize (>4 MiB) negative** — still non-redistributable), `6pro_0051.bin` (123 B, not firmware, sha256 `bce7c035…9899`), `tmp/synthetic-base.bin` (41,201 B, reference `ok=false`). Mi 6 Max/Pro are non-patchable labels (`6pro_or_6max`) in upstream and are out of scope.

## 4. MSS0 golden verification (done by W0)

Verification was performed on the **real** files, three independent ways. All pass.

1. **Final bytes at every SPEC §4.7 site** — decoded body (`XOR 0xAA` over `file[0x80:]`), compared to SPEC: Base 8/8 sites and Lite 6/6 sites match exactly in the golden outputs.
2. **Golden vs intermediate diff** — golden output differs from the corresponding intermediate only at the SPEC sites plus the trailing CRC:
   - Base: body offsets `0x18F3, 0x1D20, 0x1D22, 0x1D28, 0x1F32(2B), 0x7A21, 0x7A2A` + CRC at `0xA7FE(2B)` (10 bytes; `0x18EC`, `0x1F30` were already `0029` in the intermediate).
   - Lite: `0x217E, 0x2181, 0x2186, 0x2188, 0x218E, 0x7DC6, 0x7DCE` + CRC at `0xAFFE(2B)` (9 bytes).
3. **Reproduction from stock with the pinned Python classes** — instantiate `Mi6Patcher`/`Mi6litePatcher` (pinned `95a8f33`), apply `speed_limit_sport(35.0)`, `speed_limit_drive(25.0)`, `speed_limit_ped(15.0)`, write the SPEC site bytes into the decoded body, `fix_checksum()`, `create_full_image()`:

| Family | Output SHA-256 | Equals SPEC golden? |
| ------ | -------------- | ------------------- |
| Base (`mi6`) | `7a66169940c538eb3310136a5affa99d588c5a2c2d11b8e0ec5bedabc1c8d747` | **YES** |
| Lite (`mi6lite`) | `98f12702b11024472749f76d6305d32f99456babe740ea3cbf2fe1fecf0150db` | **YES** |

So the SPEC §4.7 site tables are **sufficient and exact** to turn stock (`sls=35,sld=25,slp=15`) into the golden output; **no SPEC/source disagreement was found** (no MSS0 escalation). Order matters: apply `sls,sld,slp` first, then the `mss0exp` site writes, then `chk`, then `img` — the ordering in SPEC §4.3.

## 5. Reference-run vectors for W2's parity harness (derived by W0 from pinned Python)

`patch_firmware(model, data, patches, web=True, allow_experimental=True)` on the factory inputs, patches `[sls=35.0, sld=25.0, slp=15.0, (mss=0.5), chk, img]`:

| Input | Patch list | Output SHA-256 | Size | Diff vs intermediate golden-input |
| ----- | ---------- | -------------- | ---- | --------------------------------- |
| `MI6-BASE-FACTORY` | `sls=35.0 sld=25.0 slp=15.0 chk img` | `84c0a2a216df5b04a7b0dcc0de18ab4c94ebfdabb8207ecf95a09cc09160af70` | 148108 | 5 B: body `0x18EC`, `0x1D22`, `0x1F30`, CRC `0xA7FE-F` — i.e. the intermediate = this + upstream `mss` forced to value 0 |
| `MI6-BASE-FACTORY` | `… mss=0.5 chk img` | `5c85f6f09263721fd678c4ab91d25e5548307a55f4a37b7f4c7ce4f98a6cec43` | 148108 | 5 B, same offsets, other values |
| `MI6-LITE-FACTORY` | `sls=35.0 sld=25.0 slp=15.0 chk img` | `12b6951615c41adc6f9a0a4316c9dc31e66455a075c48fb54d427eb6427c3dcd` | 81096 | **0 B — identical to `MI6-LITE-INTERMEDIATE`** |
| `MI6-LITE-FACTORY` | `… mss=0.5 chk img` | `1ac31f45f2987e720c77c471a712b97ffb980c1b458d7491d32997aeb204b589` | 81096 | 5 B: `0x167E`, `0x7DC6`, `0x7DCE`, CRC `0xAFFE-F` |

These are *oracle* values (Python at the pin, Python 3.13.15, keystone 0.9.2, capstone 4.0.2, crcmod 1.7). W2 must re-derive them in its own parity run and record any difference as a parity failure, not adjust them. The ordered patch logs (`name`, `offset`, `before`, `after`) were not exported by W0 (the harness is W2's); the plain `patch_firmware` path discards them.

## 6. Corpus by model / family — ship decision input (SPEC G5)

"Real fixture" = a lawful, byte-verified firmware file for that exact model/variant in this run. **Without one: `do not ship` (unsupported, hidden).**

| Model | Family / container | Detection signal (upstream) | Real fixture | Parity possible now | G5 verdict |
| ----- | ------------------ | --------------------------- | ------------ | ------------------- | ---------- |
| `mi6` (Base) | Leqi / EU1, size `0xA800`, product `0x012E`, family `0x0101` | EU1 header | **YES** — `MI6-BASE-FACTORY`, variant **v2** only | yes (v2) | **Ship candidate for variant v2.** Variant **v1** (anchors `*_V1`) has **no fixture** → must be rejected/hidden or obtain a v1 fixture |
| `mi6lite` | Leqi / EU1, size `0xB000`, family `0x0201` | EU1 header | **YES** — `MI6-LITE-FACTORY` | yes | **Ship candidate** |
| `mi5elite` | Leqi / EU1, size `0x9800/0x9880`, product `0x0124`, family `0x0301` | EU1 header | **NO** | no | **do not ship** |
| `mi5plus` | Leqi-labelled, plaintext full image, size `0x8C00`, product `0x0157`, family `0x0300` | header | **NO** | no | **do not ship** |
| `mi4` | LKS32 raw | `LKS32MC0…` markers, BW ID `001120012001` | **NO** | no | **do not ship** |
| `mi4lite` | LKS32 raw | BW ID `000920012001` | **NO** | no | **do not ship** |
| `ultra4` | LKS32 raw | BW IDs `0017/0018/0019 20122010` | **NO** | no | **do not ship** |
| `mi5` | LKS32 raw | BW ID `001500010001` / prefix `0015` | **NO** | no | **do not ship** |
| `mi5max` | LKS32 raw (via Mi5) | BW ID `001600010001` / prefix `0016` | **NO** | no | **do not ship** |
| `mi5pro` | ES32 raw | BW ID `000700010001` / prefix `0007`; `SZMC-ES-ZM-` marker | **NO** | no | **do not ship** |
| `mi4pro2nd` | ES32 raw | BW IDs `001000010001`, `000600010001` | **NO** | no | **do not ship** |
| non-patchable labels `3lite`, `6esstl`, `6pro_or_6max`, `mi4lite2`, `t2201` | various | detection only | NO (except the Mi 6 Max/Pro stray files, not usable) | n/a | never patchable; detection tests may use **synthetic** header vectors |

Consequence for the shipped matrix: **v1 ships exactly two models, `mi6` (variant v2) and `mi6lite`**, each with `sls`, `sld`, `slp`, (experimental) `mss`, `mss0exp`, `chk`, `img`, and full-dump mode. Everything else stays in the matrix as `unsupported`/hidden. Whether `mi6` v1 firmware must be sourced is part of the G5 choice in the design doc.

## 7. What W1/W2 may commit

| Artifact | Allowed? | Notes |
| -------- | -------- | ----- |
| SHA-256 manifest of the fixtures in §3 | yes | text only; include the pin and date |
| Expected detection JSON (best, ok, family, container, hits/notes) | yes | from the pinned Python |
| Synthetic test images generated at test time | yes | e.g. build an `EU1\0` header + deterministic pseudo-random body, XOR `0xAA`, correct CRC — exercises container/CRC/XOR/size logic with no vendor code. Does **not** prove model-patch parity (G5 still needs the real file) |
| Golden site tables (offsets + 2–4 byte windows) | yes | already in SPEC §4.7 |
| Vendor binary bytes (any file in §3, any length > a few bytes) | **no** | not even trimmed excerpts |
| Parity report JSON | yes | hashes/sizes/logs only, no bytes |

## 8. Acquisition requests for the owner (to widen coverage later — not blocking v1)

To ship any other model the owner must supply, per model, a lawful **unmodified DFU/MCU `.bin`** plus a note of origin and redistribution terms: `mi5elite`, `mi5plus`, `mi4`, `mi4lite`, `mi4pro2nd`, `mi5`, `mi5max`, `mi5pro`, `ultra4`; and a **Mi 6 Base firmware of variant v1** if v1 support is wanted. Each needs the same §3 treatment (hash, provenance, reference detection, parity run) before it is un-hidden.
