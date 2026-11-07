/**
 * UI-side mirror of the frozen Firmware Patcher API contract (SPEC §4.2, §4.7, §5 FP-012).
 *
 * W4 does not import from `src/lib/firmware-patcher/**` (owned by W1/W3). If W1 publishes
 * shared types, swap these for type-only imports during integration. Every response is
 * wrapped in the repo-wide `ApiResponse` envelope: `{ success, data?, error? }`.
 *
 * The field-level shapes below are ASSUMPTIONS derived from the contract summary; they are
 * listed in `build-plan/firmware-patcher/reports/ui-report.md` for W3/W6 to confirm.
 */

/** Canonical user-selectable patch codes (SPEC §4.3). `chk`/`img` are server-managed. */
export const PATCH_CODES = ["sls", "sld", "slp", "dms", "fdv", "cce", "mss", "mss0exp"] as const
export type PatchCode = (typeof PATCH_CODES)[number]

export type PatchSupport = "supported" | "experimental" | "unsupported"
export type PatchValueKind = "number" | "boolean" | "version"
export type PatchValue = number | boolean | string

export interface PatchCapability {
  code: PatchCode
  /** Upstream label (English). The UI uses its own Spanish copy and falls back to this. */
  label?: string
  status: PatchSupport
  kind: PatchValueKind
  min?: number
  max?: number
  step?: number
  default?: PatchValue
}

export interface ModelCapability {
  code: string
  displayName: string
  family?: string
  patches: PatchCapability[]
}

export interface FirmwarePatcherLimits {
  maxInputBytes: number
  maxOutputBytes?: number
  maxPatches?: number
}

export interface FirmwarePatcherCapabilities {
  enabled: boolean
  upstream: { repository?: string; version: string; commit: string }
  limits: FirmwarePatcherLimits
  models: ModelCapability[]
}

export interface FirmwareDetection {
  ok: boolean
  /** Detected model code (e.g. `mi6`); `null` when nothing scored above the threshold. */
  model: string | null
  displayName: string | null
  family: string | null
  container: string | null
  score: number | null
  /** Human-readable reasons (matched markers/tags) shown so a technician can verify. */
  hits: string[]
  notes: string[]
  supported: boolean
}

export interface DetectResponse {
  detection: FirmwareDetection
  availablePatches: PatchCapability[]
}

export interface PatchLogEntry {
  name: string
  offset: number | string
  before: string | number[] | null
  after: string | number[] | null
}

export interface PatchSelectionEntry {
  code: PatchCode
  value: PatchValue
}

export interface PatchResult {
  blob: Blob
  filename: string
  model: string | null
  inputSha256: string | null
  outputSha256: string | null
  inputSize: number | null
  outputSize: number | null
  log: PatchLogEntry[]
  logTruncated: boolean
  /** True when the patch-log header was absent or could not be decoded. */
  logUnavailable: boolean
}
