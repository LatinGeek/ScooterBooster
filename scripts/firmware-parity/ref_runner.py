#!/usr/bin/env python3
"""
Reference runner for the Firmware Patcher parity harness.

Runs the PINNED upstream bw-patcher (scooterteam/bw-patcher v1.1.6, commit
95a8f339787a1fb6486554d61b573b8e2b688c53) on a list of jobs and prints one JSON document.
It never writes firmware anywhere except the explicit --out-dir (a disposable directory).

Usage:
  python ref_runner.py --ref <BW_PATCHER_REF> --jobs jobs.json --out-dir <dir>

jobs.json: [{ "id": str, "kind": "detect"|"patch", "input": path, "model": str,
              "patches": ["sls=35.0", ...], "allowExperimental": bool }]

Patch jobs replicate bwpatcher.utils.patch_firmware (web=True) verbatim but collect the
results of every patch; the final bytes are cross-checked against the real
patch_firmware() output so the copy can never drift from upstream.
"""

import argparse
import contextlib
import hashlib
import io
import json
import os
import subprocess
import sys
from importlib import import_module


def sha256(data):
    return hashlib.sha256(bytes(data)).hexdigest()


def flatten_log(res, out):
    """Normalise upstream's heterogeneous return shapes into [{name, offset, before, after}]."""
    if res is None:
        return
    if isinstance(res, tuple):
        if len(res) == 4 and all(isinstance(x, str) for x in res):
            out.append({"name": res[0], "offset": res[1], "before": res[2], "after": res[3]})
            return
        for item in res:
            flatten_log(item, out)
        return
    if isinstance(res, list):
        for item in res:
            flatten_log(item, out)
        return
    # Anything else (should not happen): record loudly rather than hide it.
    out.append({"name": "<unexpected>", "offset": "", "before": "", "after": repr(res)})


def run_patch(utils, model, data, patches, allow_experimental):
    """Verbatim copy of patch_firmware(web=True) that also collects results."""
    module = import_module("bwpatcher.modules.%s" % model)
    patcher_class = getattr(module, "%sPatcher" % model.capitalize())
    patcher = patcher_class(data)
    log = []
    for patch in patches:
        value = None
        if "=" in patch:
            patch, value = patch.split("=")
            if patch != "fdv":
                value = float(value)
        if patch in utils.patch_map:
            method = utils.patch_map[patch](patcher)
            if utils.is_experimental_method(method) and not allow_experimental:
                raise utils.ExperimentalPatchError("%s is experimental on %s" % (patch, model))
            if value:
                res = method(value)
            else:
                res = method()
            flatten_log(res, log)
        else:
            raise Exception("The specified patch doesn't exist: %s" % patch)
    return bytes(patcher.data), log


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", required=True)
    ap.add_argument("--jobs", required=True)
    ap.add_argument("--out-dir", required=True)
    args = ap.parse_args()

    ref = os.path.abspath(args.ref)
    sys.path.insert(0, ref)
    head = subprocess.run(
        ["git", "-C", ref, "rev-parse", "HEAD"], capture_output=True, text=True
    ).stdout.strip()
    dirty = subprocess.run(
        ["git", "-C", ref, "status", "--porcelain"], capture_output=True, text=True
    ).stdout.strip()

    from bwpatcher import utils  # noqa: E402
    from bwpatcher.detect import detect_bytes  # noqa: E402
    from bwpatcher.version import __version__  # noqa: E402

    os.makedirs(args.out_dir, exist_ok=True)
    with open(args.jobs, "r", encoding="utf-8") as fh:
        jobs = json.load(fh)

    results = []
    for job in jobs:
        res = {"id": job["id"], "kind": job["kind"]}
        try:
            with open(job["input"], "rb") as fh:
                data = fh.read()
            res["inputSha256"] = sha256(data)
            res["inputSize"] = len(data)
            if job["kind"] == "detect":
                det = detect_bytes(data)
                d = det.to_dict()
                d.pop("path", None)
                res["detection"] = d
            else:
                sink = io.StringIO()
                with contextlib.redirect_stdout(sink):
                    out, log = run_patch(
                        utils,
                        job["model"],
                        data,
                        job["patches"],
                        bool(job.get("allowExperimental")),
                    )
                    # Cross-check against the real upstream entry point.
                    real = bytes(
                        utils.patch_firmware(
                            job["model"],
                            data,
                            list(job["patches"]),
                            web=True,
                            allow_experimental=bool(job.get("allowExperimental")),
                        )
                    )
                if real != out:
                    raise RuntimeError("runner copy diverged from patch_firmware()")
                path = os.path.join(args.out_dir, "%s.bin" % job["id"])
                with open(path, "wb") as fh:
                    fh.write(out)
                res.update(
                    ok=True, outputSha256=sha256(out), outputSize=len(out), outputPath=path, log=log
                )
                results.append(res)
                continue
            res["ok"] = True
        except BaseException as exc:  # noqa: BLE001 - report every failure class
            res["ok"] = False
            res["error"] = "%s: %s" % (type(exc).__name__, str(exc)[:300])
        results.append(res)

    import platform

    def ver(name):
        try:
            from importlib.metadata import version

            return version(name)
        except Exception:  # noqa: BLE001
            return None

    print(
        json.dumps(
            {
                "reference": {
                    "path": ref,
                    "head": head,
                    "dirty": bool(dirty),
                    "bwpatcherVersion": __version__,
                    "python": platform.python_version(),
                    "keystone": ver("keystone-engine"),
                    "capstone": ver("capstone"),
                    "crcmod": ver("crcmod"),
                },
                "results": results,
            }
        )
    )


if __name__ == "__main__":
    main()
