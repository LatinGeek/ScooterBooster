import {
  PATCH_CODES,
  type PatchCapability,
  type PatchCode,
  type PatchSelectionEntry,
  type PatchValue,
} from "./api-types"

/** Models that may show the custom MSS0 experiment (SPEC §4.7, FP-019). */
export const MSS0_MODELS = ["mi6", "mi6lite"] as const

export interface PatchCopy {
  label: string
  description: string
  group: "speed" | "start" | "other"
  unit?: string
}

/** Spanish (es-UY) copy. Controls and ranges still come from the capabilities API. */
export const PATCH_COPY: Record<PatchCode, PatchCopy> = {
  sls: {
    label: "Límite de velocidad en modo Sport",
    description: "Velocidad máxima en modo Sport.",
    group: "speed",
    unit: "km/h",
  },
  sld: {
    label: "Límite de velocidad en modo Drive",
    description: "Velocidad máxima en modo Drive.",
    group: "speed",
    unit: "km/h",
  },
  slp: {
    label: "Límite de velocidad en modo peatón",
    description: "Velocidad máxima en modo peatón (modelos Leqi).",
    group: "speed",
    unit: "km/h",
  },
  dms: {
    label: "Velocidad máxima del tablero",
    description: "Velocidad máxima que muestra el tablero.",
    group: "speed",
    unit: "km/h",
  },
  mss: {
    label: "Velocidad de arranque del motor",
    description: "Velocidad a partir de la cual el motor empieza a asistir.",
    group: "start",
    unit: "km/h",
  },
  mss0exp: {
    label: "Arranque MSS0 experimental (latch coherente)",
    description:
      "Arranque desde 0 km/h para Mi 6 / Mi 6 Lite. No está validado en hardware real.",
    group: "start",
  },
  fdv: {
    label: "Versión de firmware falsa",
    description: "Reporta una versión de 4 dígitos distinta a la real.",
    group: "other",
  },
  cce: {
    label: "Control de crucero",
    description: "Habilita el control de crucero.",
    group: "other",
  },
}

export const PATCH_GROUPS: Array<{ id: PatchCopy["group"]; title: string }> = [
  { id: "speed", title: "Límites de velocidad" },
  { id: "start", title: "Arranque del motor" },
  { id: "other", title: "Otros ajustes" },
]

export interface PatchFormState {
  enabled: Partial<Record<PatchCode, boolean>>
  /** Raw field text so users can type freely; validated in `evaluatePatchForm`. */
  values: Partial<Record<PatchCode, string>>
  fullDump: boolean
  acknowledged: boolean
}

export function formatDefault(capability: PatchCapability): string {
  if (capability.kind === "boolean") return ""
  if (capability.kind === "version") {
    return typeof capability.default === "string" ? capability.default : "0000"
  }
  const fallback = capability.min ?? 0
  const value = typeof capability.default === "number" ? capability.default : fallback
  return String(value)
}

export function createInitialPatchFormState(patches: PatchCapability[]): PatchFormState {
  const values: PatchFormState["values"] = {}
  for (const patch of patches) values[patch.code] = formatDefault(patch)
  return { enabled: {}, values, fullDump: false, acknowledged: false }
}

/** Patches the UI may render: not unsupported, MSS0 only on mi6/mi6lite, canonical order. */
export function visiblePatches(patches: PatchCapability[], modelCode: string | null): PatchCapability[] {
  const byCode = new Map<PatchCode, PatchCapability>()
  for (const patch of patches) {
    if (!PATCH_CODES.includes(patch.code)) continue
    if (patch.status === "unsupported") continue
    if (patch.code === "mss0exp" && !(MSS0_MODELS as readonly string[]).includes(modelCode ?? "")) continue
    byCode.set(patch.code, patch)
  }
  return PATCH_CODES.flatMap((code) => {
    const patch = byCode.get(code)
    return patch ? [patch] : []
  })
}

/** `mss0exp` supersedes the normal MSS patch, so MSS is locked while it is selected. */
export function isPatchLocked(code: PatchCode, state: PatchFormState): boolean {
  return code === "mss" && state.enabled.mss0exp === true
}

function decimalsOf(step: number | undefined): number {
  if (!step || Number.isInteger(step)) return 0
  const text = String(step)
  return text.includes(".") ? (text.split(".")[1]?.length ?? 0) : 0
}

export interface PatchFormEvaluation {
  selection: PatchSelectionEntry[]
  fieldErrors: Partial<Record<PatchCode, string>>
  experimentalCodes: PatchCode[]
  hasExperimental: boolean
}

export function evaluatePatchForm(patches: PatchCapability[], state: PatchFormState): PatchFormEvaluation {
  const selection: PatchSelectionEntry[] = []
  const fieldErrors: PatchFormEvaluation["fieldErrors"] = {}
  const experimentalCodes: PatchCode[] = []

  for (const patch of patches) {
    if (!state.enabled[patch.code]) continue
    if (isPatchLocked(patch.code, state)) continue // superseded by mss0exp; never sent

    let value: PatchValue = true
    if (patch.kind === "number") {
      const raw = (state.values[patch.code] ?? "").trim().replace(",", ".")
      const parsed = raw === "" ? Number.NaN : Number(raw)
      const min = patch.min ?? Number.NEGATIVE_INFINITY
      const max = patch.max ?? Number.POSITIVE_INFINITY
      if (!Number.isFinite(parsed)) {
        fieldErrors[patch.code] = "Ingresá un número válido."
        continue
      }
      if (parsed < min || parsed > max) {
        fieldErrors[patch.code] = `El valor debe estar entre ${min} y ${max}.`
        continue
      }
      value = Number(parsed.toFixed(decimalsOf(patch.step)))
    } else if (patch.kind === "version") {
      const raw = (state.values[patch.code] ?? "").trim()
      if (!/^\d{4}$/.test(raw)) {
        fieldErrors[patch.code] = "Ingresá exactamente 4 dígitos (por ejemplo 0000)."
        continue
      }
      value = raw
    }

    selection.push({ code: patch.code, value })
    if (patch.status === "experimental" || patch.code === "mss0exp") experimentalCodes.push(patch.code)
  }

  return { selection, fieldErrors, experimentalCodes, hasExperimental: experimentalCodes.length > 0 }
}
