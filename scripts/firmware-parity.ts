#!/usr/bin/env tsx
/**
 * Firmware-parity harness: TypeScript engine vs the PINNED Python bw-patcher.
 *
 * Compares, for the same input/model/selection:
 *   - detection (`detect_bytes`),
 *   - the ordered patch log (`name`, `offset`, `before`, `after`),
 *   - output SHA-256 and size.
 *
 * Requirements:
 *   - `BW_PATCHER_REF` (or --ref): clean checkout of bw-patcher at 95a8f33.
 *   - `BW_PATCHER_PYTHON` (or --python): interpreter with keystone/capstone/crcmod.
 *   - Real firmware fixtures at the manifest's `fixturesRoot` (never committed).
 *
 * Status semantics (SPEC FP-015): PASS only when every real-fixture comparison succeeds.
 * Missing interpreter/deps/ref/fixtures => UNVERIFIED (exit 2), never PASS. Synthetic-only
 * models are listed explicitly and never counted as shipping evidence.
 *
 * Examples:
 *   npx tsx scripts/firmware-parity.ts --ref ../bw-patcher-95a8f33 \
 *     --python ../bw-patcher/.venv/Scripts/python.exe --out tmp/firmware-parity-report.json
 */

import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { detectBytes } from "../src/lib/firmware-patcher/detect"
import { applyFirmwarePatches } from "../src/lib/firmware-patcher/engine/pipeline"
import { PARITY_GOLDENS } from "../src/lib/firmware-patcher/engine/test-helpers"
import { CAPABILITY_MATRIX, SHIPPED_MODELS } from "../src/lib/firmware-patcher/capabilities"
import {
  PATCHABLE_MODELS,
  UPSTREAM_PIN,
  isLeqiModel,
  type PatchSelectionEntry,
  type PatchableModel,
} from "../src/lib/firmware-patcher/types"

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, "..")
const MANIFEST_PATH = join(HERE, "firmware-parity", "fixture-manifest.json")
const REF_RUNNER = join(HERE, "firmware-parity", "ref_runner.py")

interface Args {
  ref: string | null
  python: string | null
  out: string
  fixtures: string | null
}

interface Manifest {
  fixturesRoot: string
  models: Record<string, { realFixtures: Array<{ id: string; path: string; sha256: string }> }>
}

interface RefResult {
  id: string
  kind: string
  ok: boolean
  inputSha256?: string
  outputSha256?: string
  outputSize?: number
  detection?: Record<string, unknown>
  log?: Array<Record<string, string>>
  error?: string
}

interface RefDocument {
  reference: Record<string, unknown>
  results: RefResult[]
}

interface Job {
  id: string
  kind: "detect" | "patch"
  input: string
  model: string
  patches?: string[]
  allowExperimental?: boolean
}

interface Comparison {
  id: string
  kind: string
  status: "PASS" | "FAIL" | "ERROR"
  hashMatch?: boolean
  logMatch?: boolean
  detectionMatch?: boolean
  expectedSha256?: string
  actualSha256?: string
  error?: string
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    ref: process.env.BW_PATCHER_REF ?? null,
    python: process.env.BW_PATCHER_PYTHON ?? null,
    out: join(REPO_ROOT, "tmp", "firmware-parity-report.json"),
    fixtures: process.env.BW_FIXTURES_DIR ?? null,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === "--ref") args.ref = argv[++i] ?? null
    else if (arg === "--python") args.python = argv[++i] ?? null
    else if (arg === "--out") args.out = argv[++i] ?? args.out
    else if (arg === "--fixtures") args.fixtures = argv[++i] ?? null
    else if (arg === "--help" || arg === "-h") {
      console.log(
        readFileSync(fileURLToPath(import.meta.url), "utf8")
          .split("\n")
          .slice(1, 30)
          .join("\n")
      )
      process.exit(0)
    }
  }
  if (args.out && !isAbsolute(args.out)) args.out = resolve(REPO_ROOT, args.out)
  return args
}

function sha256(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex")
}

function tryPython(python: string): boolean {
  const probe = spawnSync(python, ["-c", "import keystone, capstone, crcmod"], {
    encoding: "utf8",
    windowsHide: true,
  })
  return probe.status === 0
}

function findPython(explicit: string | null): string | null {
  const candidates = explicit ? [explicit] : ["python", "python3"]
  for (const candidate of candidates) {
    if (tryPython(candidate)) return candidate
  }
  return null
}

function patchString(entry: PatchSelectionEntry): string {
  return entry.value === undefined || entry.value === true
    ? entry.code
    : `${entry.code}=${String(entry.value)}`
}

function selectionsFor(model: PatchableModel): PatchSelectionEntry[][] {
  const vectors = PARITY_GOLDENS.vectors.filter((vector) => vector.model === model)
  if (vectors.length > 0) {
    return vectors.map((vector) => vector.selection as PatchSelectionEntry[])
  }
  const capability = CAPABILITY_MATRIX[model]
  const sets: PatchSelectionEntry[][] = []
  for (const [code, patch] of Object.entries(capability.patches)) {
    if (patch.status === "unsupported" || code === "mss0exp") continue
    const value =
      patch.valueKind === "boolean"
        ? true
        : patch.valueKind === "version"
          ? "0000"
          : ((patch.default as number) ?? patch.min ?? 1)
    sets.push([{ code: code as PatchSelectionEntry["code"], value }])
  }
  return sets
}

function buildJobs(manifest: Manifest): Job[] {
  const jobs: Job[] = []
  for (const [model, info] of Object.entries(manifest.models)) {
    if (!PATCHABLE_MODELS.includes(model as PatchableModel)) continue
    const capability = CAPABILITY_MATRIX[model as PatchableModel]
    const goldenVectors = PARITY_GOLDENS.vectors.filter((vector) => vector.model === model)

    for (const fixture of info.realFixtures) {
      if (!existsSync(fixture.path)) continue
      jobs.push({
        id: `detect-${model}-${fixture.id}`,
        kind: "detect",
        input: fixture.path,
        model,
      })

      if (goldenVectors.length > 0) {
        for (const vector of goldenVectors) {
          const patches = (vector.selection as PatchSelectionEntry[]).map(patchString)
          if (!vector.fullDump) patches.push("chk")
          if (isLeqiModel(model as PatchableModel)) patches.push("img")
          jobs.push({
            id: `patch-${model}-${fixture.id}-${vector.id}`,
            kind: "patch",
            input: fixture.path,
            model,
            patches,
            allowExperimental: vector.allowExperimental,
          })
        }
        continue
      }

      for (const [index, selection] of selectionsFor(model as PatchableModel).entries()) {
        const patches = selection.map(patchString)
        patches.push("chk")
        if (isLeqiModel(model as PatchableModel)) patches.push("img")
        jobs.push({
          id: `patch-${model}-${fixture.id}-${index}`,
          kind: "patch",
          input: fixture.path,
          model,
          patches,
          allowExperimental: Object.values(capability.patches).some(
            (patch) => patch.status === "experimental"
          ),
        })
      }
    }
  }
  return jobs
}

function readManifest(args: Args): { manifest: Manifest; fixturesRoot: string } {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest
  const root = args.fixtures ?? manifest.fixturesRoot
  const models: Manifest["models"] = {}
  for (const [model, info] of Object.entries(manifest.models)) {
    models[model] = {
      realFixtures: info.realFixtures.map((fixture) => ({
        ...fixture,
        path: resolve(root, fixture.path),
      })),
    }
  }
  return { manifest: { ...manifest, fixturesRoot: root, models }, fixturesRoot: root }
}

function runReference(args: Args, python: string, jobs: Job[], scratch: string): RefDocument {
  const jobsPath = join(scratch, "jobs.json")
  writeFileSync(jobsPath, JSON.stringify(jobs, null, 2))
  const run = spawnSync(
    python,
    [
      REF_RUNNER,
      "--ref",
      args.ref as string,
      "--jobs",
      jobsPath,
      "--out-dir",
      join(scratch, "out"),
    ],
    { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 }
  )
  if (run.status !== 0) {
    throw new Error(`ref_runner failed (${run.status}): ${(run.stderr || run.stdout).slice(-2000)}`)
  }
  return JSON.parse(run.stdout) as RefDocument
}

function compare(jobs: Job[], reference: RefDocument): Comparison[] {
  const comparisons: Comparison[] = []
  for (const job of jobs) {
    const expected = reference.results.find((result) => result.id === job.id)
    if (!expected) {
      comparisons.push({
        id: job.id,
        kind: job.kind,
        status: "ERROR",
        error: "missing reference result",
      })
      continue
    }
    if (expected.ok !== true) {
      comparisons.push({
        id: job.id,
        kind: job.kind,
        status: "ERROR",
        error: expected.error ?? "reference failed",
      })
      continue
    }
    try {
      const input = new Uint8Array(readFileSync(job.input))
      if (job.kind === "detect") {
        const actual = detectBytes(input)
        const detectionMatch = JSON.stringify(actual) === JSON.stringify(expected.detection)
        comparisons.push({
          id: job.id,
          kind: job.kind,
          status: detectionMatch ? "PASS" : "FAIL",
          detectionMatch,
        })
        continue
      }

      const selection = (job.patches ?? [])
        .filter((patch) => patch !== "chk" && patch !== "img")
        .map((patch) => {
          const [code, raw] = patch.split("=")
          if (code === "fdv") return { code, value: raw }
          return { code, value: raw === undefined ? true : Number(raw) }
        }) as PatchSelectionEntry[]
      const result = applyFirmwarePatches(input, job.model, selection, {
        fullDump: !(job.patches ?? []).includes("chk"),
        allowExperimental: job.allowExperimental,
      })
      const actualSha = sha256(result.data)
      const hashMatch = actualSha === expected.outputSha256
      const logMatch = JSON.stringify(result.log) === JSON.stringify(expected.log)
      comparisons.push({
        id: job.id,
        kind: job.kind,
        status: hashMatch && logMatch ? "PASS" : "FAIL",
        hashMatch,
        logMatch,
        expectedSha256: expected.outputSha256,
        actualSha256: actualSha,
      })
    } catch (error) {
      comparisons.push({
        id: job.id,
        kind: job.kind,
        status: "ERROR",
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return comparisons
}

function main(): void {
  const args = parseArgs(process.argv.slice(2))
  const report: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    pin: UPSTREAM_PIN,
    status: "UNVERIFIED",
    reason: null as string | null,
    reference: null as Record<string, unknown> | null,
    shippedModels: [...SHIPPED_MODELS],
    syntheticOnly: [] as Array<Record<string, unknown>>,
    comparisons: [] as Comparison[],
  }

  const { manifest } = readManifest(args)
  const missingFixtures = Object.values(manifest.models)
    .flatMap((info) => info.realFixtures)
    .filter((fixture) => !existsSync(fixture.path))
  const realModels = Object.keys(manifest.models)
  for (const model of PATCHABLE_MODELS) {
    if (!realModels.includes(model)) {
      report.syntheticOnly = [
        ...(report.syntheticOnly as Array<Record<string, unknown>>),
        {
          model,
          verification: CAPABILITY_MATRIX[model].verification,
          status: "NOT_RUN",
          note: "No genuine firmware fixture; synthetic-only models are not shipping evidence (SPEC G5).",
        },
      ]
    }
  }

  if (!args.ref) {
    report.reason = "BW_PATCHER_REF/--ref not provided"
    finish(args, report, 2)
    return
  }
  if (!existsSync(args.ref)) {
    report.reason = `reference checkout not found: ${args.ref}`
    finish(args, report, 2)
    return
  }
  const python = findPython(args.python)
  if (!python) {
    report.reason = "Python with keystone/capstone/crcmod not found (set BW_PATCHER_PYTHON)"
    finish(args, report, 2)
    return
  }
  if (missingFixtures.length > 0) {
    report.reason = `missing fixtures: ${missingFixtures.map((fixture) => fixture.path).join(", ")}`
    finish(args, report, 2)
    return
  }

  const scratch = join(REPO_ROOT, "tmp", "firmware-parity")
  mkdirSync(scratch, { recursive: true })
  const jobs = buildJobs(manifest)
  if (jobs.length === 0) {
    report.reason = "no real-fixture jobs to compare"
    finish(args, report, 2)
    return
  }

  const reference = runReference(args, python, jobs, scratch)
  const comparisons = compare(jobs, reference)
  report.reference = reference.reference
  report.comparisons = comparisons
  const failed = comparisons.filter((comparison) => comparison.status !== "PASS")
  report.status = failed.length === 0 ? "PASS" : "FAIL"
  if (failed.length > 0) report.reason = `${failed.length} comparison(s) failed`
  finish(args, report, failed.length === 0 ? 0 : 1)
}

function finish(args: Args, report: Record<string, unknown>, exitCode: number): void {
  mkdirSync(dirname(args.out), { recursive: true })
  writeFileSync(args.out, JSON.stringify(report, null, 2))
  const summary = {
    status: report.status,
    reason: report.reason,
    comparisons: (report.comparisons as Comparison[]).length,
    failures: (report.comparisons as Comparison[]).filter((c) => c.status !== "PASS").length,
    report: relative(REPO_ROOT, args.out) || args.out,
  }
  console.log(JSON.stringify(summary, null, 2))
  process.exit(exitCode)
}

main()
