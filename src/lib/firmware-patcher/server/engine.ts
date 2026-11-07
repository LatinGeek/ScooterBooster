import { CAPABILITIES_UPSTREAM, CAPABILITY_MATRIX } from "@/lib/firmware-patcher/capabilities"
import { detectFirmware } from "@/lib/firmware-patcher/detect"
import { applyFirmwarePatches } from "@/lib/firmware-patcher"
import {
  EngineFailure,
  type CapabilitiesView,
  type DetectionView,
  type FirmwareEngine,
  type PatchOutcome,
  type PatchRule,
  type SelectedPatch,
} from "./contract"
import type { PatchSelectionEntry } from "@/lib/firmware-patcher"

/**
 * The ONLY file that touches the W1/W2 modules. If their exported shapes differ from
 * the frozen contract, adjust the mapping here and nowhere else.
 */

const CATEGORY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/

function toFailure(error: unknown): EngineFailure {
  if (error instanceof EngineFailure) return error
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : undefined
  if (typeof code === "string") {
    const category = code.toLowerCase()
    if (CATEGORY_PATTERN.test(category)) return new EngineFailure(category, true)
  }
  // Deliberately drop the original message: engine errors must never reach logs verbatim.
  return new EngineFailure("engine_error", false)
}

function capabilities(): CapabilitiesView {
  return {
    upstream: { version: CAPABILITIES_UPSTREAM.version, commit: CAPABILITIES_UPSTREAM.commit },
    models: Object.entries(CAPABILITY_MATRIX).map(([model, entry]) => ({
      model,
      displayName: entry.displayName,
      family: entry.family,
      patches: Object.entries(entry.patches).map(([code, rule]): PatchRule => {
        const view: PatchRule = { code, status: rule.status, kind: rule.valueKind }
        if (rule.min !== undefined) view.min = rule.min
        if (rule.max !== undefined) view.max = rule.max
        if (rule.step !== undefined) view.step = rule.step
        if (rule.default !== undefined) view.default = rule.default
        return view
      }),
    })),
  }
}

function detect(input: Uint8Array): DetectionView {
  try {
    const raw = detectFirmware(input)
    return {
      ok: raw.ok,
      model: raw.model,
      displayName: raw.displayName,
      family: raw.family,
      container: raw.container,
      score: raw.score,
      hits: raw.hits.map((hit) => `${hit.model} (${hit.score}): ${hit.reasons.join(", ")}`),
      notes: [...raw.notes],
      supported: raw.supported,
    }
  } catch (error) {
    throw toFailure(error)
  }
}

function patch(
  input: Uint8Array,
  model: string,
  selection: SelectedPatch[],
  options: { allowExperimental: boolean; fullDump: boolean },
): PatchOutcome {
  try {
    // The route has already validated these codes against the matrix; the engine re-checks them.
    const entries: PatchSelectionEntry[] = selection.map((entry) => ({
      code: entry.code as PatchSelectionEntry["code"],
      value: entry.value,
    }))
    const result = applyFirmwarePatches(input, model, entries, options)
    return {
      data: result.data,
      model: result.model,
      log: result.log.map((op) => ({ name: op.name, offset: op.offset, before: op.before, after: op.after })),
    }
  } catch (error) {
    throw toFailure(error)
  }
}

export const firmwareEngine: FirmwareEngine = { capabilities, detect, patch }
