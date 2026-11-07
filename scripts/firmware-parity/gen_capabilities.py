#!/usr/bin/env python3
"""
Generate src/lib/firmware-patcher/capabilities.ts from the PINNED upstream classes (introspection),
not from the README or the SPEC table.

  python scripts/firmware-parity/gen_capabilities.py --ref <BW_PATCHER_REF> \
      --manifest scripts/firmware-parity/fixture-manifest.json \
      --out src/lib/firmware-patcher/capabilities.ts

Then run `npx prettier --write src/lib/firmware-patcher/capabilities.ts`.

What is introspected:
  * implemented  : the class resolves the method to something other than the CorePatcher stub
  * experimental : the method carries `_bw_experimental` (bwpatcher.utils.is_experimental_method)
  * value ranges : parsed from the upstream GUI (app.py) slider calls
  * GUI exposure : mirrors the model conditions in app.py (asserted against implementation below)
  * base class   : from the MRO
The custom ScooterBooster patch `mss0exp` (SPEC 4.7) is appended explicitly for mi6/mi6lite.
"""

import argparse
import json
import os
import re
import subprocess
import sys
from importlib import import_module

# User-selectable codes in canonical order -> upstream method names (None = custom patch).
PATCHES = [
    ("sls", "speed_limit_sport"),
    ("sld", "speed_limit_drive"),
    ("slp", "speed_limit_ped"),
    ("dms", "dashboard_max_speed"),
    ("fdv", "fake_drv_version"),
    ("cce", "cruise_control_enable"),
    ("mss", "motor_start_speed"),
    ("mss0exp", None),
]

# app.py slider label -> patch code
SLIDER_LABELS = {
    "SLS km/h": "sls",
    "SLD km/h": "sld",
    "SLP km/h": "slp",
    "DMS km/h": "dms",
    "MSS": "mss",
}

# Typical display names (SPEC 4.1). MODEL_DISPLAY from app.py overrides mi4/mi4lite/3lite.
DISPLAY = {
    "mi4": "Electric Scooter 42",
    "mi4lite": "Electric Scooter 4 Lite",
    "mi4pro2nd": "Mi 4 Pro 2nd",
    "mi5": "Mi 5",
    "mi5max": "Mi 5 Max",
    "mi5pro": "Mi 5 Pro",
    "mi5elite": "Mi 5 Elite",
    "mi5plus": "Xiaomi Electric Scooter 5 Plus",
    "mi6": "Mi 6",
    "mi6lite": "Mi 6 Lite",
    "ultra4": "Ultra 4",
}
NON_PATCHER_DISPLAY = {
    "3lite": "Electric Scooter 3 Lite",
    "6esstl": "Mi 6 ESS TL",
    "6pro_or_6max": "Mi 6 Pro / Mi 6 Max",
    "mi4lite2": "Mi 4 Lite (2nd generation)",
    "t2201": "T2201",
}

# Detection containers per model (from detect.py tables: BW_ID values => packaged, raw markers => raw).
RAW_MODELS = {"mi5max", "mi5", "mi4", "ultra4", "mi4pro2nd", "mi5pro", "mi4lite"}

MSS0_MODELS = {"mi6", "mi6lite"}


def parse_app(app_text):
    """Extract GUI facts from the pinned app.py."""
    leqi = re.search(r"LEQI_MODELS\s*=\s*\[([^\]]*)\]", app_text).group(1)
    leqi_models = re.findall(r'"([a-z0-9_]+)"', leqi)
    sliders = {}
    for m in re.finditer(
        r'st\.slider\(\s*"([^"]+)",\s*([0-9.]+),\s*([0-9.]+),\s*([0-9.]+),\s*([0-9.]+)', app_text
    ):
        label, lo, hi, default, step = m.groups()
        if label in SLIDER_LABELS:
            sliders[SLIDER_LABELS[label]] = dict(
                min=float(lo), max=float(hi), default=float(default), step=float(step)
            )
    display = dict(re.findall(r'"([a-z0-9]+)":\s*"([^"]+)",', re.search(
        r"MODEL_DISPLAY\s*=\s*\{(.*?)\}", app_text, re.S).group(1)))
    fdv_default = re.search(r'"Version \(4 digits\)",\s*value="(\d{4})"', app_text).group(1)
    return leqi_models, sliders, display, fdv_default


def gui_exposed(code, model, leqi_models):
    """Mirror of the model conditions in app.py (see 'Speed limits' / 'Other patches' sections)."""
    if code in ("sls", "sld"):
        return True
    if code == "slp":
        return model in leqi_models
    if code == "dms":
        return model in ("mi4", "ultra4")
    if code == "fdv":
        return model not in ["mi4pro2nd", "mi5pro", *leqi_models]
    if code == "cce":
        return model not in leqi_models
    if code == "mss":
        return model not in ("mi4", "mi4lite", "mi5plus")
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    ref = os.path.abspath(args.ref)
    sys.path.insert(0, ref)
    head = subprocess.run(
        ["git", "-C", ref, "rev-parse", "HEAD"], capture_output=True, text=True
    ).stdout.strip()
    from bwpatcher import utils  # noqa: E402
    from bwpatcher.core import CorePatcher  # noqa: E402
    from bwpatcher.modules import ALL_MODULES  # noqa: E402
    from bwpatcher.version import __version__  # noqa: E402

    with open(os.path.join(ref, "app.py"), "r", encoding="utf-8") as fh:
        leqi_models, sliders, app_display, fdv_default = parse_app(fh.read())
    with open(args.manifest, "r", encoding="utf-8") as fh:
        manifest = json.load(fh)

    models = {}
    for model in sorted(ALL_MODULES):
        module = import_module("bwpatcher.modules.%s" % model)
        cls = getattr(module, "%sPatcher" % model.capitalize())
        mro = [c.__name__ for c in cls.__mro__]
        if "LeqiPaddingSpeedPatcher" in mro:
            base = "N32/Leqi padding"
        elif "LeqiSpeedPatcher" in mro:
            base = "N32/Leqi"
        elif "LKS32Patcher" in mro:
            base = "LKS32"
        elif "ES32Patcher" in mro:
            base = "ES32"
        else:
            base = "Core"
        is_leqi = model in leqi_models
        containers = ["eu1"] if is_leqi else (["packaged", "raw"] if model in RAW_MODELS else ["packaged"])

        patches = {}
        for code, method_name in PATCHES:
            entry = dict(code=code, roles=["admin", "technician"])
            if code == "mss0exp":
                supported = model in MSS0_MODELS
                entry.update(
                    status="experimental" if supported else "unsupported",
                    valueKind="boolean",
                    upstreamImplemented=False,
                    guiExposed=False,
                    note=(
                        "ScooterBooster custom patch (SPEC 4.7); supersedes mss"
                        if supported
                        else "Custom MSS0 patch exists only for mi6/mi6lite"
                    ),
                )
                if supported:
                    entry["default"] = False
                patches[code] = entry
                continue

            method = getattr(cls, method_name, None)
            stub = getattr(CorePatcher, method_name, None)
            implemented = method is not None and method is not stub
            experimental = bool(implemented and utils.is_experimental_method(method))
            exposed = gui_exposed(code, model, leqi_models)
            if exposed and not implemented:
                raise SystemExit("GUI exposes %s on %s but the class does not implement it" % (code, model))
            if code in ("cce",):
                kind = "boolean"
            elif code == "fdv":
                kind = "version"
            else:
                kind = "number"
            entry.update(
                valueKind=kind,
                upstreamImplemented=implemented,
                guiExposed=exposed,
            )
            if implemented and exposed:
                entry["status"] = "experimental" if experimental else "supported"
                if kind == "number":
                    s = sliders[code]
                    entry.update(min=s["min"], max=s["max"], step=s["step"], default=s["default"])
                elif kind == "version":
                    entry["default"] = fdv_default
                else:
                    entry["default"] = False
            else:
                entry["status"] = "unsupported"
                entry["note"] = (
                    "Not implemented by the upstream class"
                    if not implemented
                    else "Implemented upstream but not exposed by the upstream GUI"
                )
            patches[code] = entry

        # Hidden upstream patches (D6): record for provenance, never user-selectable.
        hidden = [
            c
            for c in ("rfm", "rsls")
            if getattr(cls, utils.PATCH_METHOD_NAMES[c], None)
            is not getattr(CorePatcher, utils.PATCH_METHOD_NAMES[c], None)
        ]
        fx = manifest["models"].get(model, {})
        models[model] = dict(
            model=model,
            displayName=app_display.get(model, DISPLAY[model]),
            upstreamClass=cls.__name__,
            baseClass=base,
            family="leqi" if is_leqi else "brightway",
            containers=containers,
            autoPatches=["chk", "img"] if is_leqi else ["chk"],
            patches=patches,
            verification="real-fixture" if fx.get("realFixtures") else "synthetic-only",
            realFixtureSha256=[f["sha256"] for f in fx.get("realFixtures", [])],
            hiddenUpstreamPatches=hidden,
        )

    display_all = dict(DISPLAY)
    display_all.update(NON_PATCHER_DISPLAY)
    display_all.update({k: v for k, v in app_display.items() if k in display_all or k == "3lite"})

    cmd = "python scripts/firmware-parity/gen_capabilities.py --ref <BW_PATCHER_REF> --manifest scripts/firmware-parity/fixture-manifest.json --out src/lib/firmware-patcher/capabilities.ts"
    real_fx = {m: models[m]["realFixtureSha256"] for m in models}
    hidden_fx = {m: models[m]["hiddenUpstreamPatches"] for m in models}
    for m in models.values():
        m.pop("realFixtureSha256")
        m.pop("hiddenUpstreamPatches")
    header = f"""/**
 * GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Upstream : scooterteam/bw-patcher v{__version__} @ {head}
 * Source   : introspection of the pinned bwpatcher classes + upstream GUI (app.py) at that commit
 * Command  : {cmd}
 *            npx prettier --write src/lib/firmware-patcher/capabilities.ts
 * Extension: `mss0exp` (SPEC 4.7) is a ScooterBooster custom patch, appended for mi6/mi6lite.
 *
 * The matrix is authoritative for upstream patches; regenerate it (and re-run the parity
 * harness) whenever the upstream pin moves. See PROVENANCE.md.
 */

import {{
  PATCH_CODES,
  isPatchableModel,
  type ModelCapability,
  type PatchCapability,
  type PatchCode,
  type PatchableModel,
}} from "./types"

export const CAPABILITIES_UPSTREAM = {{
  version: {json.dumps(__version__)},
  commit: {json.dumps(head)},
}} as const

export const CAPABILITY_MATRIX: Readonly<Record<PatchableModel, ModelCapability>> = {json.dumps(models, indent=2)}

/** SHA-256 of the genuine firmware images used as parity fixtures, per model (SPEC G5). */
export const REAL_FIXTURE_SHA256: Readonly<Record<string, readonly string[]>> = {json.dumps(real_fx, indent=2)}

/** Upstream patches intentionally not exposed (SPEC D6): present in patch_map, hidden in the GUI. */
export const HIDDEN_UPSTREAM_PATCHES: Readonly<Record<string, readonly string[]>> = {json.dumps(hidden_fx, indent=2)}

const DISPLAY_NAMES: Readonly<Record<string, string>> = {json.dumps(display_all, indent=2)}
"""
    tail = """
export function getModelCapability(model: PatchableModel): ModelCapability {
  return CAPABILITY_MATRIX[model]
}

export function getPatchCapability(model: PatchableModel, code: PatchCode): PatchCapability {
  return CAPABILITY_MATRIX[model].patches[code]
}

/** Display name for any detector label (patchable or not); falls back to the raw label. */
export function getModelDisplayName(label: string): string {
  return DISPLAY_NAMES[label] ?? label
}

/** Patch codes available (supported or experimental) for a model, in canonical order. */
export function getAvailablePatchCodes(model: PatchableModel): PatchCode[] {
  return PATCH_CODES.filter((code) => CAPABILITY_MATRIX[model].patches[code].status !== "unsupported")
}

/**
 * SPEC G5 shipping rule: a model is shippable only when engine parity was proven on a genuine
 * firmware image. Models proven on synthetic images only stay detectable but unsupported.
 */
export function isModelShipped(model: string): boolean {
  return isPatchableModel(model) && CAPABILITY_MATRIX[model].verification === "real-fixture"
}

export const SHIPPED_MODELS: readonly PatchableModel[] = (
  Object.keys(CAPABILITY_MATRIX) as PatchableModel[]
).filter((model) => isModelShipped(model))
"""
    with open(args.out, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(header + tail)
    print("wrote", args.out, "models:", len(models), "head:", head)


if __name__ == "__main__":
    main()
