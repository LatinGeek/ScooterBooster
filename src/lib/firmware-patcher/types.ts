/**
 * Firmware Patcher — shared types (server-safe, serializable, no runtime imports).
 *
 * Upstream reference: scooterteam/bw-patcher v1.1.6 @ 95a8f339787a1fb6486554d61b573b8e2b688c53
 * (see PROVENANCE.md). Keep this file free of engine code so UI/API layers can import the
 * types without pulling the patch engine into a client bundle.
 */

// ---------------------------------------------------------------------------
// Pin
// ---------------------------------------------------------------------------

export const UPSTREAM_PIN = {
  repository: "https://github.com/scooterteam/bw-patcher",
  version: "1.1.6",
  commit: "95a8f339787a1fb6486554d61b573b8e2b688c53",
  date: "2026-09-28",
} as const

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

/** The 11 model modules exposed by bwpatcher/modules at the pinned commit. */
export const PATCHABLE_MODELS = [
  "mi4",
  "mi4lite",
  "mi4pro2nd",
  "mi5",
  "mi5max",
  "mi5pro",
  "mi5elite",
  "mi5plus",
  "mi6",
  "mi6lite",
  "ultra4",
] as const
export type PatchableModel = (typeof PATCHABLE_MODELS)[number]

/** Labels the detector may emit that must NEVER be patchable (detect.py NON_PATCHER_LABELS). */
export const NON_PATCHER_LABELS = ["3lite", "6esstl", "6pro_or_6max", "mi4lite2", "t2201"] as const
export type NonPatcherLabel = (typeof NON_PATCHER_LABELS)[number]

export function isPatchableModel(value: unknown): value is PatchableModel {
  return typeof value === "string" && (PATCHABLE_MODELS as readonly string[]).includes(value)
}

/** Leqi/N32 controllers (upstream LEQI_MODELS in app.py). */
export const LEQI_MODELS = [
  "mi5elite",
  "mi6",
  "mi6lite",
  "mi5plus",
] as const satisfies readonly PatchableModel[]

export function isLeqiModel(model: PatchableModel): boolean {
  return (LEQI_MODELS as readonly string[]).includes(model)
}

// ---------------------------------------------------------------------------
// Detection (port of bwpatcher/detect.py)
// ---------------------------------------------------------------------------

export type DetectionFamily = "unknown" | "leqi" | "brightway"
export type DetectionContainer = "unknown" | "eu1" | "type2_map" | "packaged" | "raw"

export interface DetectionHit {
  model: string
  score: number
  /** Byte-exact upstream reason strings, e.g. "+50 product@0x1C=0x012E". */
  reasons: string[]
}

export interface LeqiHeader {
  tag: string
  body_size: string
  family_u16: string
  product_u16: string
  product_tail: string
  prefix: string
  eu2: boolean
}

export interface Type2MapHeader {
  type: "type2_map"
  prefix: string
}

export interface PackagedHeader {
  type: "packaged"
  class_u16: number
  geom_u16: number
  size_class: number
  crc_u16: number
  ver: string
  id: string
  prefix: string
}

export interface RawDumpHeader {
  type: "raw_dump"
  markers: string[]
}

export type DetectionHeader = LeqiHeader | Type2MapHeader | PackagedHeader | RawDumpHeader

/** 1:1 with upstream `Detection.to_dict()` minus the (path) field. */
export interface Detection {
  size: number
  family: DetectionFamily
  container: DetectionContainer
  header: DetectionHeader | null
  best: string | null
  ok: boolean
  hits: DetectionHit[]
  notes: string[]
  bwpatcher: boolean
}

/** Detection enriched for ScooterBooster consumers (API/UI). */
export interface FirmwareDetection extends Detection {
  /** Human display name for `best` (null when nothing was identified). */
  displayName: string | null
  /** Score of the winning hit (0 when none). */
  score: number
  /** The patch engine may be invoked: ok, patchable, not a non-patcher label, matrix says shipped. */
  supported: boolean
  /** Model code usable with the engine; null unless `supported`. */
  model: PatchableModel | null
}

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/** User-selectable patch codes in CANONICAL order (SPEC §4.3). chk/img are server-managed. */
export const PATCH_CODES = ["sls", "sld", "slp", "dms", "fdv", "cce", "mss", "mss0exp"] as const
export type PatchCode = (typeof PATCH_CODES)[number]

/** Patches the server appends itself; never accepted from a client. */
export const AUTO_PATCH_CODES = ["chk", "img"] as const
export type AutoPatchCode = (typeof AUTO_PATCH_CODES)[number]

export function isPatchCode(value: unknown): value is PatchCode {
  return typeof value === "string" && (PATCH_CODES as readonly string[]).includes(value)
}

export type PatchStatus = "supported" | "experimental" | "unsupported"
export type PatchValueKind = "number" | "boolean" | "version"
export type StaffRole = "admin" | "technician"

export interface PatchCapability {
  code: PatchCode
  status: PatchStatus
  valueKind: PatchValueKind
  /** number kind only */
  min?: number
  max?: number
  step?: number
  default?: number | string | boolean
  /** Roles allowed to request this patch (both staff roles in this run, SPEC D3). */
  roles: readonly StaffRole[]
  /** Upstream class implements the method (not the CorePatcher NotImplemented stub). */
  upstreamImplemented: boolean
  /** Upstream GUI (app.py) exposes the control for this model. */
  guiExposed: boolean
  /** Why the patch is unsupported / how it was derived (diagnostic, English). */
  note?: string
}

export type ModelVerification = "real-fixture" | "synthetic-only"

export interface ModelCapability {
  model: PatchableModel
  displayName: string
  /** Upstream class name, e.g. "Mi6Patcher". */
  upstreamClass: string
  baseClass: "LKS32" | "ES32" | "N32/Leqi" | "N32/Leqi padding" | "Core"
  family: Exclude<DetectionFamily, "unknown">
  /** Containers the detector can report for this model. */
  containers: readonly Exclude<DetectionContainer, "unknown" | "type2_map">[]
  /** Patches appended by the server: chk (unless full dump) and img (Leqi only). */
  autoPatches: readonly AutoPatchCode[]
  patches: Record<PatchCode, PatchCapability>
  /**
   * `real-fixture`: engine parity was proven on a genuine firmware image of this model (SPEC G5).
   * `synthetic-only`: parity proven on synthetic images only; NOT sufficient to ship under G5.
   */
  verification: ModelVerification
}

// ---------------------------------------------------------------------------
// Selection / engine contract (consumed by W3)
// ---------------------------------------------------------------------------

/** Client selection entry. `value` type depends on the matrix: number | "dddd" | boolean. */
export interface PatchSelectionEntry {
  code: PatchCode
  value?: number | string | boolean
}

export interface PatchOptions {
  /** Skip auto-`chk` (Leqi still gets `img`). Both staff roles may enable it (SPEC D4). */
  fullDump?: boolean
  /** Required for any experimental selection (SPEC FP-007). Never derived from a query parameter. */
  allowExperimental?: boolean
}

/** One entry of the ordered patch log: 1:1 with upstream (name, offset, before, after). */
export interface PatchOperation {
  name: string
  /** Lower-case Python `hex()` of the byte offset, e.g. "0x1a2c". */
  offset: string
  /** Hex of the bytes before (or an upstream marker such as "N/A"/"skipped"). */
  before: string
  /** Hex of the bytes after (or an upstream marker). */
  after: string
}

export interface PatchResult {
  data: Uint8Array
  log: PatchOperation[]
  model: PatchableModel
  /** Canonical, normalised patch codes actually executed (includes server-managed chk/img). */
  applied: string[]
}

// ---------------------------------------------------------------------------
// Typed errors (engine/errors.ts implements them; codes live here for API mapping)
// ---------------------------------------------------------------------------

export type FirmwarePatchErrorCode =
  | "invalid_input"
  | "unsupported_model"
  | "invalid_selection"
  | "experimental_not_allowed"
  | "signature_not_found"
  | "unexpected_bytes"
  | "encoding_failed"
  | "container_invalid"
  | "patch_failed"
