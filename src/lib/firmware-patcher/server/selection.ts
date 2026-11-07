import { z } from "zod"
import type { ModelRules, PatchRule, PatchValue, SelectedPatch } from "./contract"
import { FIRMWARE_LIMITS } from "./config"
import { FirmwareRejection, invalidSelection } from "./errors"

/** User-selectable codes, in canonical application order (SPEC section 4.3). */
export const USER_PATCH_ORDER = ["sls", "sld", "slp", "dms", "fdv", "cce", "mss", "mss0exp"] as const
export type UserPatchCode = (typeof USER_PATCH_ORDER)[number]

/** Server-managed; never accepted from the client. */
const AUTO_MANAGED = new Set(["chk", "img"])

/** Custom ScooterBooster patch: always experimental regardless of matrix data (defence in depth). */
const ALWAYS_EXPERIMENTAL = new Set<string>(["mss0exp"])

const PATCH_LABELS: Record<UserPatchCode, string> = {
  sls: "límite de velocidad Sport",
  sld: "límite de velocidad Drive",
  slp: "límite de velocidad Peatón",
  dms: "velocidad máxima del tablero",
  fdv: "versión de firmware falsa",
  cce: "control de crucero",
  mss: "velocidad de arranque del motor",
  mss0exp: "arranque MSS0 experimental",
}

const MAX_SELECTION_JSON_BYTES = 4096

const entrySchema = z
  .object({
    code: z.string().max(16, "Código de parche inválido."),
    value: z.union([z.number(), z.boolean(), z.string().max(32, "Valor de parche inválido.")]),
  })
  .strict()

const selectionSchema = z
  .array(entrySchema, { error: "La selección debe ser una lista de parches." })
  .max(FIRMWARE_LIMITS.maxUserPatches, `Máximo ${FIRMWARE_LIMITS.maxUserPatches} parches por solicitud.`)

/** Capitalised Spanish label for a patch code (falls back to the code itself). */
export function patchLabel(code: string): string {
  const label = isUserCode(code) ? PATCH_LABELS[code] : code
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function isUserCode(code: string): code is UserPatchCode {
  return (USER_PATCH_ORDER as readonly string[]).includes(code)
}

export function parseSelectionJson(raw: string | undefined): { code: string; value: PatchValue }[] {
  if (raw === undefined || raw.trim() === "") {
    throw invalidSelection("Selecciona al menos un parche.")
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_SELECTION_JSON_BYTES) {
    throw invalidSelection("La selección de parches es demasiado grande.")
  }
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    throw invalidSelection("La selección de parches no es un JSON válido.")
  }
  const parsed = selectionSchema.safeParse(json)
  if (!parsed.success) {
    throw invalidSelection(parsed.error.issues[0]?.message ?? "La selección de parches no es válida.")
  }
  if (parsed.data.length === 0) {
    throw invalidSelection("Selecciona al menos un parche.")
  }
  return parsed.data
}

function isOnStep(value: number, rule: PatchRule): boolean {
  if (rule.step === undefined || rule.step <= 0) return true
  const origin = rule.min ?? 0
  const steps = Math.round((value - origin) / rule.step)
  return Math.abs(origin + steps * rule.step - value) < 1e-6
}

function validateValue(code: UserPatchCode, rule: PatchRule, value: PatchValue, model: string): PatchValue {
  const label = PATCH_LABELS[code]
  switch (rule.kind) {
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw invalidSelection(`El valor de ${label} debe ser un número.`, model)
      }
      if ((rule.min !== undefined && value < rule.min) || (rule.max !== undefined && value > rule.max)) {
        throw invalidSelection(
          `El valor de ${label} debe estar entre ${rule.min ?? "el mínimo"} y ${rule.max ?? "el máximo"}.`,
          model,
        )
      }
      if (!isOnStep(value, rule)) {
        throw invalidSelection(`El valor de ${label} debe ser múltiplo de ${rule.step}.`, model)
      }
      return value
    }
    case "boolean": {
      if (value !== true) {
        throw invalidSelection(`El parche ${label} se activa con true; omítelo para no aplicarlo.`, model)
      }
      return true
    }
    case "version": {
      if (typeof value !== "string" || !/^\d{4}$/.test(value)) {
        throw invalidSelection(`El valor de ${label} debe tener exactamente 4 dígitos.`, model)
      }
      return value
    }
  }
}

export interface ValidatedSelection {
  /** Canonical order, `mss` removed when `mss0exp` is present, no chk/img. */
  patches: SelectedPatch[]
  experimental: boolean
  mss0exp: boolean
}

/** Validates against the capability matrix for the server-detected model. No clamping. */
export function validateSelection(
  entries: { code: string; value: PatchValue }[],
  rules: ModelRules,
  allowExperimental: boolean,
): ValidatedSelection {
  const seen = new Set<string>()
  const byCode = new Map<UserPatchCode, SelectedPatch>()
  let experimental = false

  for (const entry of entries) {
    if (AUTO_MANAGED.has(entry.code)) {
      throw invalidSelection("Los parches de checksum (chk) e imagen (img) se aplican automáticamente.", rules.model)
    }
    if (!isUserCode(entry.code)) {
      throw invalidSelection("La selección contiene un parche desconocido.", rules.model)
    }
    if (seen.has(entry.code)) {
      throw invalidSelection("La selección contiene parches duplicados.", rules.model)
    }
    seen.add(entry.code)

    const rule = rules.patches.find((candidate) => candidate.code === entry.code)
    if (!rule || rule.status === "unsupported") {
      throw invalidSelection(
        `El parche ${PATCH_LABELS[entry.code]} no está disponible para ${rules.displayName}.`,
        rules.model,
      )
    }

    const value = validateValue(entry.code, rule, entry.value, rules.model)
    if (rule.status === "experimental" || ALWAYS_EXPERIMENTAL.has(entry.code)) {
      experimental = true
    }
    byCode.set(entry.code, { code: entry.code, value })
  }

  const mss0exp = byCode.has("mss0exp")
  if (mss0exp) {
    // mss0exp is the complete MSS0 patch; any client-supplied mss value is ignored.
    byCode.delete("mss")
  }

  if (experimental && !allowExperimental) {
    throw new FirmwareRejection(
      "experimental_not_acknowledged",
      "La selección incluye parches experimentales. Confirma que aceptas usarlos para continuar.",
      400,
      rules.model,
    )
  }

  const patches = USER_PATCH_ORDER.flatMap((code) => {
    const selected = byCode.get(code)
    return selected ? [selected] : []
  })
  return { patches, experimental, mss0exp }
}
