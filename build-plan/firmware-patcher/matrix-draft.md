# Capability matrix draft — bw-patcher v1.1.6 × ScooterBooster

> **Owner:** W0 (draft) → W1 (generates `src/lib/firmware-patcher/capabilities.ts`).
> **Upstream pin:** `scooterteam/bw-patcher` v1.1.6, commit `95a8f339787a1fb6486554d61b573b8e2b688c53` (2026-09-28).
> **Generated:** 2026-11-07 by W0 against the **real pinned classes**.
> **Status:** `status / definedIn / experimental` columns = **PYTHON-INTROSPECTED** (verified at runtime). Ranges/defaults = **SOURCE-VERIFIED** (transcribed from the pinned `app.py` and cross-checked against `assert`/`raise` statements in the pinned methods). `mss0exp` = **SPEC-DEFINED, GOLDEN-VERIFIED** (see `fixtures.md`). Nothing in this file is hardware-validated.

## 1. How this was produced (reproducible)

```text
git -C "D:\Coding\Firmware disassembling\third_party\bw-patcher" archive 95a8f339787a1fb6486554d61b573b8e2b688c53 | tar -x -C <ref-dir>
python 3.13.15 + keystone-engine 0.9.2 + capstone 4.0.2 + crcmod 1.7 + setuptools 80.10.2   (disposable env outside the repo)
python introspect_matrix.py <ref-dir>        # script reproduced in Appendix A
```

Pinned-tree facts verified: `bwpatcher/version.py` resolves `pyproject.toml` → `version = "1.1.6"`; `ALL_MODULES` = the 11 model modules below (`leqi_speed` excluded via `NON_MODEL_MODULES`).

**Do not use** `D:\Coding\Firmware disassembling\third_party\bw-patcher` as a working tree: it is checked out at the ScooterBooster fork (`a176ee6`, branch `scooterbooster-fork`, `1.1.3.post1`, uncommitted edits to `app.py`, `mi6.py`, `utils.py`). Only `git archive 95a8f33` is the oracle.

**Environment gotchas (for W2's parity recipe):**

- `capstone==4.0.2` (the version `pyproject.toml` asks for, `^4.0.2`) imports `distutils`, removed in Python ≥ 3.12. Install `setuptools` (80.x, as upstream pins) and `import setuptools` **before** `import capstone`. Plain `pip install capstone` resolves to 5.x, which differs from the pinned constraint; use `capstone==4.0.2` for fidelity.
- `keystone-engine 0.9.2` and `crcmod 1.7` install cleanly on Python 3.13 Windows (wheel / pure Python).
- A venv under `%TEMP%` was damaged by an out-of-disk event (`python.exe` launcher vanished); parity runs should create the venv on a drive with free space and verify `python -c "import keystone, capstone, crcmod"`.

## 2. Legend

`S` = supported (implemented, not marked experimental upstream) · **`E`** = experimental (upstream `@experimental`) · `—` = unsupported (method absent or still the `CorePatcher` `NotImplementedError` stub) · `(hidden)` = implemented but **not** a user control in upstream `app.py` and not to be exposed in v1 (D6) · `auto` = server-managed (`chk`/`img`), never client-selectable.

## 3. Matrix (11 models × upstream codes + custom `mss0exp`)

| Model | Display | Base | sls | sld | slp | dms | fdv | cce | mss | rfm | rsls | chk | img | mss0exp | Real fixture |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `mi4` | Electric Scooter 4 (Mi 4) | LKS32 | S | S | — | S | S | S | — | S (hidden) | S (hidden) | auto | — | — | NO — do not ship |
| `mi4lite` | Electric Scooter 4 Lite | LKS32 | S | S | — | — | S | S | — | S (hidden) | S (hidden) | auto | — | — | NO — do not ship |
| `mi4pro2nd` | Mi 4 Pro 2nd | ES32 | S | S | — | — | — | S | S | S (hidden) | S (hidden) | auto | — | — | NO — do not ship |
| `mi5` | Mi 5 | LKS32 | S | S | — | — | S | S | S | S (hidden) | S (hidden) | auto | — | — | NO — do not ship |
| `mi5elite` | Mi 5 Elite | N32/Leqi | S | S | S | — | — | — | S | — | — | auto | auto | — | NO — do not ship |
| `mi5max` | Mi 5 Max | LKS32 (via Mi5) | S | S | — | — | S | S | S | S (hidden) | S (hidden) | auto | — | — | NO — do not ship |
| `mi5plus` | Xiaomi Electric Scooter 5 Plus | Core (plaintext full image) | S | S | S | — | — | — | — | S (hidden) | S (hidden) | auto | auto | — | NO — do not ship |
| `mi5pro` | Mi 5 Pro | ES32 | S | S | — | — | — | S | S | S (hidden) | S (hidden) | auto | — | — | NO — do not ship |
| `mi6` | Mi 6 | N32/Leqi padding | S | S | S | — | — | — | **E** | — | — | auto | auto | **E** (custom) | YES |
| `mi6lite` | Mi 6 Lite | N32/Leqi padding | S | S | S | — | — | — | **E** | — | — | auto | auto | **E** (custom) | YES |
| `ultra4` | Ultra 4 | LKS32 | S | S | — | S | S | S | S | S (hidden) | S (hidden) | auto | — | — | NO — do not ship |

Reading the table:

- Only **two** upstream cells are experimental at v1.1.6: `mi6.mss` and `mi6lite.mss`. (`ultra4` `sls`/`sld`/`rsls` were de-experimentalised in 1.1.6; `ultra4.mss` is not experimental.)
- `chk` is implemented on all 11; `img` only on the Leqi/N32 family (`mi5elite`, `mi6`, `mi6lite`) and on `mi5plus`. Matches the SPEC §4.2 rule "`img` appended automatically for Leqi models".
- Introspection found **zero discrepancies** between the upstream GUI visibility rules and the implemented methods (no control that would hit `NotImplementedError`; no implemented non-hidden patch the GUI forgets).
- **Ship column** (SPEC G5): only `mi6` and `mi6lite` have a real fixture in this run. Every other model is **`do not ship`** and must be hidden/unsupported in the generated `capabilities.ts` until a lawful fixture + byte-parity result exists. See `fixtures.md`.

## 4. Controls, values, ranges and visibility rules

| Code | Label (ES for UI at W4) | Kind | Min | Max | Step | Default | Visible for models (upstream `app.py` rule) | Evidence |
| ---- | ----------------------- | ---- | --- | --- | ---- | ------- | ------------------------------------------- | -------- |
| `sls` | Límite de velocidad Sport | number km/h | 1.0 | 35.0 | 0.1 | 25.0 | all 11 | slider in `app.py`; no per-model assert |
| `sld` | Límite de velocidad Drive | number km/h | 1.0 | 35.0 | 0.1 | 15.0 | all 11 | idem |
| `slp` | Límite de velocidad peatón | number km/h | 1.0 | 35.0 | 0.1 | 6.0 | `mi5elite`, `mi6`, `mi6lite`, `mi5plus` | idem |
| `dms` | Velocidad máxima del tablero | number km/h | 1.0 | 29.6 | 0.1 | 22.0 | `mi4`, `ultra4` | slider + `assert 1.0 <= speed <= 29.6` in both methods |
| `mss` | Velocidad de arranque del motor | number km/h | 1.0 | 9.0 | 0.1 | 5.0 | all except `mi4`, `mi4lite`, `mi5plus` | slider; `ultra4` asserts `1 <= speed <= 9` |
| `fdv` | Versión de firmware falsa | version (string) | — | — | — | `"0000"` | all except `mi4pro2nd`, `mi5pro`, and the 4 Leqi models | `LKS32Patcher.fake_drv_version`: `isdigit()` and `len == 4` else `ValueError` |
| `cce` | Control crucero | boolean | — | — | — | off | all except the 4 Leqi models | — |
| `mss0exp` | MSS0 experimental (coherent latch) | boolean | — | — | — | off | `mi6`, `mi6lite` only (SPEC §4.7; **custom, not upstream**) | golden-verified; supersedes `mss` |
| `rfm` / `rsls` | (not exposed) | — | — | — | — | — | none (D6) | present in `patch_map`, absent from `app.py` |
| `chk` / `img` | (server-managed) | — | — | — | — | — | none | auto-appended |

Role restrictions (SPEC D3/D4): both `admin` and `technician` may use experimental patches and full-dump mode; `user`/anonymous none. Experimental additionally needs `allowExperimental=true` (FP-007).

`mi6.mss` / `mi6lite.mss`: when `mss0exp` is selected the server must ignore any `mss` value (SPEC §4.7). When `mss0exp` is **not** selected the plain upstream `mss` stays available as experimental.

## 5. Findings W1/W2 must carry into the port (found in pinned source, not in SPEC)

1. **Numeric semantics.** Speeds are `int(factor * kmh)` on IEEE doubles — i.e. truncation (`Math.trunc(10 * kmh)` in JS gives the same bits; do **not** round). `mi5plus._clamp_kmh` uses `int(round(kmh))` — Python **banker's rounding** (round-half-to-even), range 1..255, which differs from `Math.round` at `.5` ties (`round(2.5) == 2`). It is only reachable for `mi5plus`, which is currently `do not ship`, but the port must not use `Math.round` there.
2. **Value dispatch is truthiness-based.** `patch_firmware` calls `method(value)` only `if value:`; `mss=0.0` would call `method()` with no argument and raise `TypeError`. The slider minimum is 1.0, so this is unreachable from the UI, but the TS port must treat `0` as invalid input (400) rather than "no value". Note the Base "rampfix" intermediate golden file was therefore produced with a direct class call (upstream `mss` at 0), not through `patch_firmware`.
3. **`fdv` strictness differs between GUI and engine.** The GUI silently skips a value that is not 4 digits; the engine raises. SPEC §4.2 already allows the stricter 400.
4. **Leqi speed patches always include the region-limit fix.** `LeqiSpeedPatcher._patch_speed_block` runs `_speed_limit_fix()` (region limit) on each call for `mi5elite`/`mi6`/`mi6lite`; the first speed patch also installs the hijack + inject block, later calls update constants (`speed_logic_block` vs `speed_constants_updated` log names). The ordered patch log therefore depends on call order — the canonical order in SPEC §4.3 (`sls, sld, slp, …`) is part of the parity contract.
5. **`mi6` has firmware variants.** Anchors `SIG_SPEED_CALC_ANCHOR_V1/V2` and region-limit anchors V1/V2; `_detect_variant()` picks one. The Base factory fixture in this run is **variant `v2`** (verified by instantiating the pinned `Mi6Patcher`). **No v1 fixture exists** → per SPEC G5 ("including Mi6 v1/v2 variants where upstream supports them") v1 must either get a lawful fixture or be rejected with a clear error (the current upstream code would fall back to V1 anchors when neither is found).
6. **`rfm` on LKS32 models is a conditional no-op.** `LKS32Patcher.region_free` returns `None` when the class has no `SNS` attribute (`mi4`, `mi4lite`, `ultra4`). Not exposed (D6), so informational only.
7. **Base-class default.** `CorePatcher.fix_checksum(start_ofs)` requires an argument; every shipped family overrides it with a zero-arg method (`LKS32`, `ES32`, `CoreN32`, `Mi5plus`) — the matrix `chk` is implemented for all 11.
8. **`patch_firmware` prints to stdout** and the reference harness must capture it; patch results can be `tuple`, `list[tuple]`, `list` containing `None`/tuples (e.g. `ES32.fix_checksum` returns `[tuple, res]` where `res` may be `None`). The ordered patch log in the parity harness must normalise these shapes identically on both sides.
9. **Upstream experimental unlock** is a URL parameter (`?experimental=1`). ScooterBooster replaces it with the server-validated `allowExperimental=true` (SPEC FP-007); a query parameter alone must never enable it.

## 6. `mss0exp` (custom) matrix entry

```text
code: mss0exp            label: "MSS0 experimental launch (coherent latch)"
models: mi6, mi6lite     status: experimental (custom, not upstream)
roles: admin, technician default: off  value kind: boolean
requires: allowExperimental=true + inline acknowledgment
order: after mss, before chk/img      supersedes: mss (server ignores client mss when set)
provenance: SPEC §4.7; D:\Coding\Firmware disassembling\docs\research\mi6-*-mss0-*.md (read-only)
site tables: SPEC §4.7 — W0 verified every final byte against the real golden outputs (fixtures.md §4)
```

Predecessor states observed at the mss0exp sites (after `sls/sld/slp`, decoded body, from real fixtures):

| Family | Stock bytes at sites (SPEC order) | Notes |
| ------ | --------------------------------- | ----- |
| `mi6` | `0x18EC 2d29` · `0x18F2 03dd` · `0x1D20 a1f11e05` · `0x1D28 7826` · `0x1F30 1e29` · `0x1F32 3ff7f3ae` · `0x7A20 0088` · `0x7A2A 1e2b` | Also observed: the upstream-`mss` (value 0) intermediate has `0x18EC 0029`, `0x1D20 a1f10005`, `0x1F30 0029`. SPEC §4.7 requires accepting "stock/MSS0 predecessor or already patched" — W2 must enumerate the exact accepted predecessor set per site (upstream `mss=N` writes variable bytes at `0x18EC`, `0x1D22`, `0x1F30`). |
| `mi6lite` | `0x7DC6 2d2d` · `0x7DCE 1e2d` · `0x217E 1e2a` · `0x2180 6edd` · `0x2186 a2f11e05` · `0x218E 7826` | Upstream `mss=0.5` on Lite writes `0x167E`, `0x7DC6`, `0x7DCE` (not the ramp sites at `0x217E…`); `mss0exp` leaves `0x167E` untouched. |

## 7. Machine-readable draft (compact)

Codes: `S`/`E` status, trailing `h` = hidden (implemented, not exposed). Absent code = unsupported. `W1` expands this into `capabilities.ts` with provenance header.

```json
{"upstream":{"version":"1.1.6","commit":"95a8f339787a1fb6486554d61b573b8e2b688c53"},"values":{"sls":{"kind":"number","unit":"km/h","min":1.0,"max":35.0,"step":0.1,"default":25.0},"sld":{"kind":"number","unit":"km/h","min":1.0,"max":35.0,"step":0.1,"default":15.0},"slp":{"kind":"number","unit":"km/h","min":1.0,"max":35.0,"step":0.1,"default":6.0},"dms":{"kind":"number","unit":"km/h","min":1.0,"max":29.6,"step":0.1,"default":22.0},"mss":{"kind":"number","unit":"km/h","min":1.0,"max":9.0,"step":0.1,"default":5.0},"fdv":{"kind":"version","pattern":"^[0-9]{4}$","default":"0000"},"cce":{"kind":"boolean"},"mss0exp":{"kind":"boolean","default":false,"custom":true},"rfm":{"kind":"boolean"},"rsls":{"kind":"boolean"}},"models":{"mi4":{"class":"Mi4Patcher","leqi":false,"patches":{"sls":"S","sld":"S","dms":"S","fdv":"S","cce":"S","rfm":"Sh","rsls":"Sh","chk":"S"}},"mi4lite":{"class":"Mi4litePatcher","leqi":false,"patches":{"sls":"S","sld":"S","fdv":"S","cce":"S","rfm":"Sh","rsls":"Sh","chk":"S"}},"mi4pro2nd":{"class":"Mi4pro2ndPatcher","leqi":false,"patches":{"sls":"S","sld":"S","cce":"S","mss":"S","rfm":"Sh","rsls":"Sh","chk":"S"}},"mi5":{"class":"Mi5Patcher","leqi":false,"patches":{"sls":"S","sld":"S","fdv":"S","cce":"S","mss":"S","rfm":"Sh","rsls":"Sh","chk":"S"}},"mi5elite":{"class":"Mi5elitePatcher","leqi":true,"patches":{"sls":"S","sld":"S","slp":"S","mss":"S","chk":"S","img":"S"}},"mi5max":{"class":"Mi5maxPatcher","leqi":false,"patches":{"sls":"S","sld":"S","fdv":"S","cce":"S","mss":"S","rfm":"Sh","rsls":"Sh","chk":"S"}},"mi5plus":{"class":"Mi5plusPatcher","leqi":true,"patches":{"sls":"S","sld":"S","slp":"S","rfm":"Sh","rsls":"Sh","chk":"S","img":"S"}},"mi5pro":{"class":"Mi5proPatcher","leqi":false,"patches":{"sls":"S","sld":"S","cce":"S","mss":"S","rfm":"Sh","rsls":"Sh","chk":"S"}},"mi6":{"class":"Mi6Patcher","leqi":true,"patches":{"sls":"S","sld":"S","slp":"S","mss":"E","chk":"S","img":"S","mss0exp":"E"}},"mi6lite":{"class":"Mi6litePatcher","leqi":true,"patches":{"sls":"S","sld":"S","slp":"S","mss":"E","chk":"S","img":"S","mss0exp":"E"}},"ultra4":{"class":"Ultra4Patcher","leqi":false,"patches":{"sls":"S","sld":"S","dms":"S","fdv":"S","cce":"S","mss":"S","rfm":"Sh","rsls":"Sh","chk":"S"}}}}
```

## Appendix A — introspection script (verbatim)

```python
#!/usr/bin/env python3
"""W0 capability-matrix introspection for bw-patcher v1.1.6 (95a8f33).

Usage:  python introspect_matrix.py <path-to-pinned-bw-patcher-tree>
Prints JSON to stdout. Imports the REAL pinned classes (keystone/capstone/crcmod
must be importable) and reads real method resolution + @experimental markers;
value ranges come from the pinned app.py GUI constants (transcribed below,
cross-checked by the asserts/raises extracted from each method's source).
"""
import ast
import inspect
import json
import sys
import textwrap
from importlib import import_module

root = sys.argv[1]
sys.path.insert(0, root)

from bwpatcher import __version__  # noqa: E402
from bwpatcher.core import CorePatcher  # noqa: E402
from bwpatcher.modules import ALL_MODULES  # noqa: E402
from bwpatcher.utils import (  # noqa: E402
    PATCH_METHOD_NAMES,
    is_experimental_method,
    patch_map,
)

LEQI_MODELS = ["mi5elite", "mi6", "mi6lite", "mi5plus"]  # app.py v1.1.6

# Transcribed from app.py (pinned). Value kind + range + default.
VALUE_SPEC = {
    "sls": ("number", 1.0, 35.0, 0.1, 25.0),
    "sld": ("number", 1.0, 35.0, 0.1, 15.0),
    "slp": ("number", 1.0, 35.0, 0.1, 6.0),
    "dms": ("number", 1.0, 29.6, 0.1, 22.0),
    "mss": ("number", 1.0, 9.0, 0.1, 5.0),
    "fdv": ("version", None, None, None, "0000"),
    "cce": ("boolean", None, None, None, False),
    "rfm": ("boolean", None, None, None, False),
    "rsls": ("boolean", None, None, None, False),
    "chk": ("boolean", None, None, None, False),
    "img": ("boolean", None, None, None, False),
}


def gui_exposed(model: str, code: str) -> bool:
    """Mirror of app.py control-visibility logic at the pinned commit."""
    if code in ("sls", "sld"):
        return True
    if code == "slp":
        return model in LEQI_MODELS
    if code == "dms":
        return model in ("mi4", "ultra4")
    if code == "fdv":
        return model not in ["mi4pro2nd", "mi5pro", *LEQI_MODELS]
    if code == "cce":
        return model not in LEQI_MODELS
    if code == "mss":
        return model not in ["mi4", "mi4lite", "mi5plus"]
    return False  # rfm, rsls, chk, img: not user controls (chk/img auto)


def defining_class(cls, name):
    for k in cls.__mro__:
        if name in k.__dict__:
            return k
    return None


def source_constraints(fn):
    """assert/raise-ValueError conditions found directly in the method body."""
    out = []
    try:
        tree = ast.parse(textwrap.dedent(inspect.getsource(fn)))
    except (OSError, TypeError, SyntaxError):
        return out
    for node in ast.walk(tree):
        if isinstance(node, ast.Assert):
            out.append("assert " + ast.unparse(node.test))
        elif isinstance(node, ast.Raise) and isinstance(node.exc, ast.Call):
            fname = ast.unparse(node.exc.func)
            if fname in ("ValueError", "NotImplementedError"):
                out.append("raise " + ast.unparse(node.exc)[:120])
    return out


def main():
    result = {
        "upstreamVersion": __version__,
        "models": {},
        "patchCodes": list(patch_map.keys()),
        "guiRule": "app.py visibility logic mirrored in gui_exposed()",
    }
    discrepancies = []
    for model in ALL_MODULES:
        mod = import_module(f"bwpatcher.modules.{model}")
        cls = getattr(mod, f"{model.capitalize()}Patcher")
        entry = {
            "class": cls.__name__,
            "mro": [k.__name__ for k in cls.__mro__ if k is not object],
            "leqi": model in LEQI_MODELS,
            "patches": {},
        }
        for code, mname in PATCH_METHOD_NAMES.items():
            raw = getattr(cls, mname, None)
            owner = defining_class(cls, mname)
            base_stub = (
                raw is not None
                and CorePatcher.__dict__.get(mname) is not None
                and getattr(raw, "__func__", raw) is CorePatcher.__dict__[mname]
            )
            implemented = raw is not None and not base_stub
            kind, vmin, vmax, vstep, vdef = VALUE_SPEC[code]
            exp = bool(implemented and is_experimental_method(raw))
            gui = gui_exposed(model, code)
            if gui and not implemented:
                discrepancies.append(f"{model}.{code}: GUI exposes control but method is not implemented")
            if implemented and not gui and code not in ("chk", "img", "rfm", "rsls"):
                discrepancies.append(f"{model}.{code}: implemented but GUI does not expose")
            status = "unsupported"
            if implemented:
                status = "experimental" if exp else "supported"
            entry["patches"][code] = {
                "status": status,
                "method": mname,
                "definedIn": owner.__name__ if (owner and implemented) else None,
                "experimentalUpstream": exp,
                "guiExposed": gui,
                "valueKind": kind,
                "min": vmin,
                "max": vmax,
                "step": vstep,
                "default": vdef,
                "sourceConstraints": source_constraints(getattr(raw, "__func__", raw)) if implemented else [],
            }
        result["models"][model] = entry
    result["discrepancies"] = sorted(discrepancies)
    print(json.dumps(result, indent=1, sort_keys=False))


main()
```
