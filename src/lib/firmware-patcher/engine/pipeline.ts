/**
 * Public engine entry point: `applyFirmwarePatches`.
 *
 * Canonical order (SPEC Â§4.3): sls, sld, slp, dms, fdv, cce, mss, mss0exp, chk, img.
 * `chk`/`img` are server-managed; `mss0exp` supersedes `mss` on mi6/mi6lite.
 */

import { CAPABILITY_MATRIX, getPatchCapability } from "../capabilities"
import {
  PATCH_CODES,
  isLeqiModel,
  isPatchCode,
  isPatchableModel,
  type PatchCode,
  type PatchOptions,
  type PatchResult,
  type PatchSelectionEntry,
  type PatchableModel,
} from "../types"
import { FirmwarePatchError } from "./errors"
import { applyMss0ToBody } from "./mss0"
import { createPatcher } from "./registry"
import type { CorePatcher, PatchOp } from "./core"

type AutoCode = "chk" | "img"
type ExecCode = PatchCode | AutoCode

interface NormalisedEntry {
  code: PatchCode
  value: number | string | boolean
}

const CANONICAL = new Map<PatchCode, number>(PATCH_CODES.map((code, index) => [code, index]))

function validateModel(model: unknown): PatchableModel {
  if (!isPatchableModel(model)) {
    throw new FirmwarePatchError("unsupported_model", "Unknown firmware model")
  }
  return model
}

function validateNumber(model: PatchableModel, code: PatchCode, value: unknown): number {
  const capability = getPatchCapability(model, code)
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new FirmwarePatchError("invalid_selection", `${code} requires a numeric value`)
  }
  if (capability.min !== undefined && value < capability.min) {
    throw new FirmwarePatchError("invalid_selection", `${code} must be >= ${capability.min}`)
  }
  if (capability.max !== undefined && value > capability.max) {
    throw new FirmwarePatchError("invalid_selection", `${code} must be <= ${capability.max}`)
  }
  return value
}

function validateVersion(value: unknown): string {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0 || value > 9999) {
      throw new FirmwarePatchError("invalid_selection", "fdv requires exactly 4 digits")
    }
    return String(value).padStart(4, "0")
  }
  if (typeof value !== "string" || !/^\d{4}$/.test(value)) {
    throw new FirmwarePatchError("invalid_selection", "fdv requires exactly 4 digits")
  }
  return value
}

function validateEntry(
  model: PatchableModel,
  entry: PatchSelectionEntry,
  allowExperimental: boolean
): NormalisedEntry | null {
  const code = entry.code
  if (!isPatchCode(code)) {
    throw new FirmwarePatchError("invalid_selection", `Patch ${String(code)} is not selectable`)
  }
  const capability = getPatchCapability(model, code)
  if (capability.status === "unsupported") {
    throw new FirmwarePatchError("invalid_selection", `${code} is not available for ${model}`)
  }
  if (capability.status === "experimental" && !allowExperimental) {
    throw new FirmwarePatchError(
      "experimental_not_allowed",
      `${code} is experimental on ${model}; allowExperimental is required`
    )
  }

  switch (capability.valueKind) {
    case "number":
      return { code, value: validateNumber(model, code, entry.value) }
    case "version":
      return { code, value: validateVersion(entry.value) }
    case "boolean":
      if (entry.value === false) return null
      if (entry.value !== undefined && entry.value !== true) {
        throw new FirmwarePatchError("invalid_selection", `${code} requires a boolean value`)
      }
      return { code, value: true }
  }
}

/**
 * Normalise a client selection: reject duplicates and unknown/self-managed codes, validate
 * values against the generated matrix, and order by the canonical list.
 */
export function normalizeSelection(
  model: PatchableModel,
  selection: ReadonlyArray<PatchSelectionEntry>,
  options: PatchOptions = {}
): NormalisedEntry[] {
  if (!Array.isArray(selection)) {
    throw new FirmwarePatchError("invalid_selection", "selection must be an array")
  }
  const allowExperimental = options.allowExperimental === true

  // `mss0exp` supersedes `mss`; detect it first so a client-supplied mss value is ignored.
  const mss0Entry = selection.find((entry) => entry.code === "mss0exp" && entry.value !== false)
  if (mss0Entry) validateEntry(model, mss0Entry, allowExperimental)

  const seen = new Set<PatchCode>()
  const normalised: NormalisedEntry[] = []
  for (const entry of selection) {
    const code = entry.code
    if (code === ("chk" as PatchCode) || code === ("img" as PatchCode)) {
      throw new FirmwarePatchError("invalid_selection", `${code} is managed by the server`)
    }
    if (!isPatchCode(code)) {
      throw new FirmwarePatchError("invalid_selection", `Patch ${String(code)} is not selectable`)
    }
    if (mss0Entry && code === "mss") continue
    if (seen.has(code)) {
      throw new FirmwarePatchError("invalid_selection", `Duplicate patch ${code}`)
    }
    seen.add(code)
    const validated = validateEntry(model, entry, allowExperimental)
    if (validated) normalised.push(validated)
  }

  normalised.sort((a, b) => (CANONICAL.get(a.code) ?? 99) - (CANONICAL.get(b.code) ?? 99))
  return normalised
}

const METHODS: Readonly<
  Record<
    Exclude<ExecCode, "mss0exp">,
    (patcher: CorePatcher, value?: number | string | boolean) => PatchOp[]
  >
> = {
  sls: (patcher, value) => patcher.speedLimitSport(value as number),
  sld: (patcher, value) => patcher.speedLimitDrive(value as number),
  slp: (patcher, value) => patcher.speedLimitPed(value as number),
  dms: (patcher, value) => patcher.dashboardMaxSpeed(value as number),
  fdv: (patcher, value) => patcher.fakeDrvVersion(value as string),
  cce: (patcher) => patcher.cruiseControlEnable(),
  mss: (patcher, value) => patcher.motorStartSpeed(value as number),
  chk: (patcher) => patcher.fixChecksum(0),
  img: (patcher) => patcher.createFullImage(),
}

/**
 * Apply a firmware patch selection to `input`.
 *
 * Pure with respect to `input` (copied), deterministic, and all-or-nothing: any error throws
 * before a result is returned. `chk` is appended unless `fullDump`; `img` is appended for Leqi
 * models. Both are never accepted from the caller.
 */
export function applyFirmwarePatches(
  input: Uint8Array,
  model: string,
  selection: ReadonlyArray<PatchSelectionEntry>,
  options: PatchOptions = {}
): PatchResult {
  const patchable = validateModel(model)
  if (!(input instanceof Uint8Array) || input.length === 0) {
    throw new FirmwarePatchError("invalid_input", "Firmware input must be a non-empty byte array")
  }

  const entries = normalizeSelection(patchable, selection, options)
  const order: ExecCode[] = entries.map((entry) => entry.code)
  if (!options.fullDump) order.push("chk")
  if (isLeqiModel(patchable)) order.push("img")

  const values = new Map<PatchCode, number | string | boolean>(
    entries.map((entry) => [entry.code, entry.value])
  )

  const patcher = createPatcher(patchable, input)
  const log: PatchOp[] = []

  for (const code of order) {
    if (code === "mss0exp") {
      const result = applyMss0ToBody(patcher.data, patchable)
      patcher.data = result.data
      log.push(...result.log)
      continue
    }
    const method = METHODS[code]
    log.push(...method(patcher, values.get(code as PatchCode)))
  }

  return {
    data: patcher.data.slice(),
    log,
    model: patchable,
    applied: order,
  }
}

/** Re-exported for consumers that need the matrix without importing the engine internals. */
export { CAPABILITY_MATRIX }
