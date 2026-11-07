#!/usr/bin/env tsx
/**
 * Firmware Patcher benchmark evidence for SPEC FP-016.
 *
 * Measures detection and patch latency on a 1 MiB input (the real mi6 image with a padded
 * footer, so the parser still sees a genuine 43 KiB Leqi body) and on the raw fixtures.
 * Reports p50/p95/max. Peak-heap is reported as an approximate, non-authoritative figure.
 *
 *   npx tsx scripts/firmware-bench.ts --out tmp/firmware-bench.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { performance } from "node:perf_hooks"

import { detectFirmware } from "../src/lib/firmware-patcher/detect"
import { applyFirmwarePatches } from "../src/lib/firmware-patcher/engine/pipeline"
import { FIXTURE_MANIFEST, fixturePath } from "../src/lib/firmware-patcher/engine/test-helpers"
import type { PatchSelectionEntry } from "../src/lib/firmware-patcher/types"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, "..")

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index] ?? 0
}

function stats(values: number[]): { p50: number; p95: number; max: number; mean: number } {
  return {
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    max: Math.max(...values),
    mean: values.reduce((a, b) => a + b, 0) / values.length,
  }
}

function bench(fn: () => void, iterations: number): number[] {
  const samples: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }
  return samples
}

function main(): void {
  const outArg = process.argv.indexOf("--out")
  const out = outArg >= 0 ? process.argv[outArg + 1] : "tmp/firmware-bench.json"
  const outPath = out
    ? isAbsolute(out)
      ? out
      : resolve(REPO_ROOT, out)
    : resolve(REPO_ROOT, "tmp/firmware-bench.json")

  const basePath = fixturePath("mi6-base-factory")
  if (!basePath || !existsSync(basePath)) {
    console.log(
      JSON.stringify({
        status: "UNVERIFIED",
        reason: `fixture not found (fixturesRoot=${FIXTURE_MANIFEST.fixturesRoot})`,
      })
    )
    process.exit(2)
  }

  const factory = new Uint8Array(readFileSync(basePath))
  const oneMiB = new Uint8Array(1024 * 1024)
  oneMiB.set(factory)

  const selection: PatchSelectionEntry[] = [
    { code: "sls", value: 35 },
    { code: "sld", value: 25 },
    { code: "slp", value: 15 },
    { code: "mss0exp", value: true },
  ]
  const iterations = 30

  // Warm up the JIT and the first-run allocations.
  detectFirmware(oneMiB)
  applyFirmwarePatches(oneMiB, "mi6", selection, { allowExperimental: true })

  const heapBefore = process.memoryUsage().heapUsed
  const detect1MiB = bench(() => detectFirmware(oneMiB), iterations)
  const patch1MiB = bench(
    () => applyFirmwarePatches(oneMiB, "mi6", selection, { allowExperimental: true }),
    iterations
  )
  const heapAfter = process.memoryUsage().heapUsed

  const detectFixture = bench(() => detectFirmware(factory), iterations)
  const patchFixture = bench(
    () => applyFirmwarePatches(factory, "mi6", selection, { allowExperimental: true }),
    iterations
  )

  const report = {
    generatedAt: new Date().toISOString(),
    status: "PASS",
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    fixture: basePath,
    inputMiB: oneMiB.length,
    iterations,
    detection1MiBMs: stats(detect1MiB),
    patch1MiBMs: stats(patch1MiB),
    detectionFixtureMs: stats(detectFixture),
    patchFixtureMs: stats(patchFixture),
    patchesApplied: ["sls", "sld", "slp", "mss0exp", "chk", "img"],
    judgement: {
      detectionP95Under150ms: stats(detect1MiB).p95 <= 150,
      patchP95Under1500ms: stats(patch1MiB).p95 <= 1500,
    },
    approxHeapDeltaBytes: heapAfter - heapBefore,
    note:
      "Heap delta is approximate (no forced GC) and covers 30 warm iterations; it is not the " +
      "per-request incremental figure. Real firmware binaries are never committed.",
  }

  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(report, null, 2))
  console.log(
    JSON.stringify({ status: report.status, ...report.judgement, report: outPath }, null, 2)
  )
}

main()
