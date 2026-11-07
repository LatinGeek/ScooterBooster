/**
 * Firmware model detection — exact port of bwpatcher/detect.py.
 *
 * Upstream: scooterteam/bw-patcher v1.1.6 @ 95a8f339787a1fb6486554d61b573b8e2b688c53
 * (CC BY-NC-SA 4.0, see PROVENANCE.md). Deterministic, side-effect free; never throws for
 * malformed input (an unrecognised header yields `ok: false` plus diagnostics in `notes`).
 */

import { getModelDisplayName, isModelShipped } from "./capabilities"
import {
  NON_PATCHER_LABELS,
  isPatchableModel,
  type Detection,
  type DetectionHit,
  type FirmwareDetection,
  type LeqiHeader,
  type PackagedHeader,
  type RawDumpHeader,
} from "./types"

export const HEADER_LEN = 0x80
export const MIN_BODY = 0x400
export const MIN_SCORE = 30

const LEQI_TAGS: readonly string[] = ["EU1\0", "BU1\0"]

const LEQI_PRODUCT: Readonly<Record<number, string>> = {
  0x0124: "mi5elite",
  0x012e: "mi6",
  0x0157: "mi5plus",
  0x008c: "mi6lite_or_6esstl",
}

const LEQI_SIZE: Readonly<Record<number, string>> = {
  0x9800: "mi5elite",
  0x9880: "mi5elite",
  0xa800: "mi6",
  0xb000: "mi6lite",
  0x8c00: "mi5plus",
  0x6f00: "6esstl",
}

const LEQI_FAMILY: Readonly<Record<number, string>> = {
  0x0101: "mi6",
  0x0201: "mi6lite_or_elite",
  0x0301: "mi5elite",
  0x0300: "mi5plus",
  0x0200: "6esstl",
}

const BW_ID: Readonly<Record<string, string>> = {
  "001500010001": "mi5",
  "001600010001": "mi5max",
  "000700010001": "mi5pro",
  "001000010001": "mi4pro2nd",
  "000600010001": "mi4pro2nd",
  "001320122002": "t2201",
  "001720122010": "ultra4",
  "001820122010": "ultra4",
  "001920122010": "ultra4",
  "000920012001": "mi4lite",
  "001020012001": "mi4lite2",
  "001120012001": "mi4",
  "021622152185": "3lite",
  "021422142185": "3lite",
}

const BW_ID_PREFIX4: Readonly<Record<string, string>> = {
  "0007": "mi5pro",
  "0015": "mi5",
  "0016": "mi5max",
}

const RAW_NEEDLES: readonly string[] = [
  "LKS32MC071CBT8FFP",
  "LKS32MC071CBT8FF",
  "LKS32MC081",
  "SZMC-ES-ZM-0283M",
  "SUNWODA",
  "DEPRD5C",
  "DEPRA3ES",
]

// ---------------------------------------------------------------------------
// Small byte helpers (kept local so detect.ts has no engine dependency)
// ---------------------------------------------------------------------------

function at(buf: Uint8Array, index: number): number {
  return buf[index] ?? 0
}

function u16le(buf: Uint8Array, offset: number): number {
  return at(buf, offset) | (at(buf, offset + 1) << 8)
}

function toHex(buf: Uint8Array): string {
  let out = ""
  for (const b of buf) out += b.toString(16).padStart(2, "0")
  return out
}

function ascii(buf: Uint8Array, start: number, end: number): string {
  let out = ""
  for (let i = start; i < end && i < buf.length; i++) out += String.fromCharCode(at(buf, i))
  return out
}

/** bytes.find(needle) for an ASCII needle; -1 when absent. */
function findAscii(buf: Uint8Array, needle: string, from = 0): number {
  const n = needle.length
  outer: for (let i = from; i + n <= buf.length; i++) {
    for (let j = 0; j < n; j++) {
      if (at(buf, i + j) !== needle.charCodeAt(j)) continue outer
    }
    return i
  }
  return -1
}

function upperHex(value: number, pad = 0): string {
  return value.toString(16).toUpperCase().padStart(pad, "0")
}

// ---------------------------------------------------------------------------
// Header parsers
// ---------------------------------------------------------------------------

function hdr(data: Uint8Array): Uint8Array {
  return data.length >= HEADER_LEN ? data.subarray(0, HEADER_LEN) : data
}

interface RawLeqi {
  tag: string
  bodySize: number
  familyU16: number
  productU16: number
  productTail: string
  prefix: string
  eu2: boolean
}

function parseLeqi(h: Uint8Array): RawLeqi | null {
  if (h.length < 0x22) return null
  const tag = ascii(h, 0x0a, 0x0e)
  if (!LEQI_TAGS.includes(tag)) return null
  const size = u16le(h, 0x0e)
  if (size < MIN_BODY) return null
  return {
    tag: tag.slice(0, 3),
    bodySize: size,
    familyU16: u16le(h, 0x02),
    productU16: (at(h, 0x1c) << 8) | at(h, 0x1d),
    productTail: toHex(h.subarray(0x1c, 0x22)),
    prefix: toHex(h.subarray(0, 10)),
    eu2: findAscii(h, "EU2\0") >= 0,
  }
}

function isAsciiDigits(h: Uint8Array, start: number, end: number): boolean {
  if (end <= start) return false
  for (let i = start; i < end; i++) {
    const b = at(h, i)
    if (b < 48 || b > 57) return false
  }
  return true
}

function parseBwPackaged(h: Uint8Array): PackagedHeader | null {
  if (h.length < 0x2e) return null
  if (LEQI_TAGS.includes(ascii(h, 0x0a, 0x0e))) return null
  if (at(h, 0) === 2 && at(h, 1) === 0 && at(h, 2) === 0 && at(h, 3) === 0) return null
  if (!isAsciiDigits(h, 0x12, 0x16)) return null
  if (!isAsciiDigits(h, 0x22, 0x2e)) return null
  return {
    type: "packaged",
    class_u16: u16le(h, 0),
    geom_u16: u16le(h, 2),
    size_class: u16le(h, 8),
    crc_u16: u16le(h, 0x0a),
    ver: ascii(h, 0x12, 0x16),
    id: ascii(h, 0x22, 0x2e),
    prefix: toHex(h.subarray(0, 0x12)),
  }
}

function parseRawMarkers(h: Uint8Array): string[] {
  const tags: string[] = []
  for (const needle of RAW_NEEDLES) {
    const i = findAscii(h, needle)
    if (i >= 0) {
      let end = i + needle.length
      while (end < h.length && at(h, end) >= 32 && at(h, end) < 127) end++
      tags.push(ascii(h, i, end))
    }
  }
  return tags
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

type Scores = Map<string, DetectionHit>

function add(scores: Scores, model: string, pts: number, reason: string): void {
  if (!model) return
  let hit = scores.get(model)
  if (!hit) {
    hit = { model, score: 0, reasons: [] }
    scores.set(model, hit)
  }
  hit.score += pts
  hit.reasons.push(`+${pts} ${reason}`)
}

function resolveAmbiguous(model: string, bodySize: number | null): string {
  if (model === "mi6lite_or_6esstl") {
    if (bodySize === 0x6f00) return "6esstl"
    if (bodySize === 0xb000) return "mi6lite"
    return model
  }
  if (model === "mi6lite_or_elite") {
    if (bodySize === 0x9800 || bodySize === 0x9880) return "mi5elite"
    if (bodySize === 0xb000) return "mi6lite"
    return model
  }
  return model
}

function finalize(det: Detection, scores: Scores): void {
  for (const key of [...scores.keys()]) {
    if (key.startsWith("mi6lite_or_") || key.endsWith("_or_elite") || key.endsWith("_or_6esstl")) {
      scores.delete(key)
    }
  }

  // Array.prototype.sort is stable (ES2019); equal scores keep insertion order like Python.
  const hits = [...scores.values()].sort((a, b) => b.score - a.score)
  det.hits = hits
  const top = hits[0]
  if (!top) return

  const tied = hits.filter((h) => h.score === top.score)
  if (tied.length > 1) {
    det.notes.push("tied: " + tied.map((h) => `${h.model}=${h.score}`).join(", "))
    return
  }

  det.best = top.model
  det.bwpatcher = isPatchableModel(top.model)
  if (
    top.score >= MIN_SCORE &&
    det.bwpatcher &&
    !(NON_PATCHER_LABELS as readonly string[]).includes(top.model)
  ) {
    det.ok = true
  } else if (!isPatchableModel(top.model)) {
    det.notes.push(`${top.model} is not a bwpatcher module`)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Exact port of `detect_bytes()` (without the `path` field). */
export function detectBytes(data: Uint8Array): Detection {
  const det: Detection = {
    size: data.length,
    family: "unknown",
    container: "unknown",
    header: null,
    best: null,
    ok: false,
    hits: [],
    notes: [],
    bwpatcher: false,
  }
  const scores: Scores = new Map()
  const h = hdr(data)

  const leqi = parseLeqi(h)
  if (leqi) {
    det.family = "leqi"
    det.container = "eu1"
    const header: LeqiHeader = {
      tag: leqi.tag,
      body_size: `0x${upperHex(leqi.bodySize)}`,
      family_u16: `0x${upperHex(leqi.familyU16, 4)}`,
      product_u16: `0x${upperHex(leqi.productU16, 4)}`,
      product_tail: leqi.productTail,
      prefix: leqi.prefix,
      eu2: leqi.eu2,
    }
    det.header = header
    const size = leqi.bodySize

    const alias = LEQI_PRODUCT[leqi.productU16]
    if (alias) {
      const resolved = resolveAmbiguous(alias, size)
      if (resolved.includes("_or_")) {
        for (const part of resolved.split("_or_")) {
          add(scores, part, 20, `product@0x1C=0x${upperHex(leqi.productU16, 4)} (ambiguous)`)
        }
      } else {
        add(scores, resolved, 50, `product@0x1C=0x${upperHex(leqi.productU16, 4)}`)
      }
    }

    const sm = LEQI_SIZE[size]
    if (sm) add(scores, sm, 40, `size@0x0E=0x${upperHex(size)}`)

    const famAlias = LEQI_FAMILY[leqi.familyU16]
    if (famAlias) {
      const fam = resolveAmbiguous(famAlias, size)
      if (fam.includes("_or_")) {
        for (const part of fam.split("_or_")) {
          add(scores, part, 15, `family@0x02=0x${upperHex(leqi.familyU16, 4)} (ambiguous)`)
        }
      } else {
        add(scores, fam, 30, `family@0x02=0x${upperHex(leqi.familyU16, 4)}`)
      }
    }

    if (leqi.eu2) add(scores, "mi6", 15, "EU2 tag in header")

    finalize(det, scores)
    return det
  }

  if (h.length >= 4 && at(h, 0) === 2 && at(h, 1) === 0 && at(h, 2) === 0 && at(h, 3) === 0) {
    det.family = "brightway"
    det.container = "type2_map"
    det.header = { type: "type2_map", prefix: toHex(h.subarray(0, 0x10)) }
    add(scores, "6pro_or_6max", 40, "Brightway type-2 map header")
    det.notes.push("Brightway type-2 map (6pro/6max/cross) — no bwpatcher module yet")
    finalize(det, scores)
    return det
  }

  const bw = parseBwPackaged(h)
  if (bw) {
    det.family = "brightway"
    det.container = "packaged"
    det.header = bw
    const ident = bw.id
    const direct = BW_ID[ident]
    if (direct) {
      add(scores, direct, 50, `id@0x22=${ident}`)
    } else {
      const p4 = ident.slice(0, 4)
      const prefixModel = BW_ID_PREFIX4[p4]
      if (prefixModel) add(scores, prefixModel, 25, `id@0x22 prefix ${p4}…`)
      det.notes.push(`unknown id@0x22=${ident}`)
    }
    finalize(det, scores)
    return det
  }

  const markers = parseRawMarkers(h)
  if (markers.length > 0) {
    det.family = "brightway"
    det.container = "raw"
    const header: RawDumpHeader = { type: "raw_dump", markers }
    det.header = header
    const joined = markers.join(" ")
    if (joined.includes("LKS32MC071CBT8FFP")) {
      add(scores, "mi5max", 40, "header LKS32MC071CBT8FFP")
    } else if (joined.includes("LKS32MC071CBT8FF")) {
      add(scores, "mi5", 35, "header LKS32MC071CBT8FF")
    }
    if (joined.includes("LKS32MC081")) {
      add(scores, "mi4", 15, "header LKS32MC081 (also ultra4)")
      add(scores, "ultra4", 15, "header LKS32MC081 (also mi4)")
      det.notes.push("LKS32MC081 in header is ambiguous (mi4/Scooter 42 vs ultra4)")
    }
    if (joined.includes("SZMC-ES-ZM-0283M")) {
      add(scores, "mi4pro2nd", 15, "header SZMC-ES-ZM-0283M (also mi5pro)")
      add(scores, "mi5pro", 15, "header SZMC-ES-ZM-0283M (also mi4pro2nd)")
      det.notes.push("SZMC-ES-ZM-0283M in header is ambiguous (mi4pro2nd vs mi5pro)")
    }
    if (joined.includes("SUNWODA")) add(scores, "mi4lite", 20, "header SUNWODA")
    finalize(det, scores)
    return det
  }

  det.notes.push("no recognizable header in [0x00, 0x80)")
  return det
}

/**
 * Detection enriched for API/UI use. `supported` additionally requires that the model has
 * cleared the shipping rule (SPEC G5), so unverified models are reported but never patchable.
 */
export function detectFirmware(data: Uint8Array): FirmwareDetection {
  const det = detectBytes(data)
  const best = det.best
  const patchable = det.ok && best !== null && isPatchableModel(best)
  const model = patchable && best !== null && isPatchableModel(best) ? best : null
  const supported = model !== null && isModelShipped(model)
  return {
    ...det,
    displayName: best ? getModelDisplayName(best) : null,
    score: det.hits[0]?.score ?? 0,
    supported,
    model: supported ? model : null,
  }
}
