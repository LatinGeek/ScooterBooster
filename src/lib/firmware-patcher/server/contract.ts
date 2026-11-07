/**
 * Server-side view of the firmware engine. The adapter in ./engine.ts is the only
 * place that maps the W1/W2 modules onto these shapes.
 */
export type PatchStatus = "supported" | "experimental" | "unsupported"
export type PatchValueKind = "number" | "boolean" | "version"
export type PatchValue = number | boolean | string

export interface PatchRule {
  code: string
  status: PatchStatus
  kind: PatchValueKind
  min?: number
  max?: number
  step?: number
  default?: PatchValue
  /** Spanish UI label. Added by the API layer when the matrix does not provide one. */
  label?: string
}

export interface ModelRules {
  model: string
  displayName: string
  family: string
  patches: PatchRule[]
}

export interface CapabilitiesView {
  upstream: { version: string; commit: string }
  models: ModelRules[]
}

export interface DetectionView {
  ok: boolean
  model: string | null
  displayName: string | null
  family: string | null
  container: string | null
  score: number
  hits: string[]
  notes: string[]
  supported: boolean
}

export interface PatchLogEntry {
  name: string
  offset: number
  before: string
  after: string
}

export interface SelectedPatch {
  code: string
  value: PatchValue
}

export interface PatchOutcome {
  data: Uint8Array
  log: PatchLogEntry[]
  model: string
}

/** Thrown by the adapter for every engine failure; never carries bytes or raw engine messages. */
export class EngineFailure extends Error {
  /** Short snake_case category safe for audit/logs. */
  readonly category: string
  /** true => the engine rejected the input deliberately (422); false => unexpected (500). */
  readonly expected: boolean

  constructor(category: string, expected: boolean) {
    super(`Firmware engine failure: ${category}`)
    this.name = "EngineFailure"
    this.category = category
    this.expected = expected
  }
}

export interface FirmwareEngine {
  capabilities(): CapabilitiesView
  detect(input: Uint8Array): DetectionView
  patch(
    input: Uint8Array,
    model: string,
    selection: SelectedPatch[],
    options: { allowExperimental: boolean; fullDump: boolean },
  ): PatchOutcome
}
