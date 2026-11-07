/**
 * ScooterBooster custom `mss0exp` (SPEC §4.7): coherent-latch MSS0 experiment.
 *
 * Applied to the DECODED N32 body, after the normal speed/region patches and before `chk`.
 * Every write is preceded by an allow-list check against the stock / upstream-MSS / already
 * patched predecessor states. The function works on a copy, so a rejected site leaves the
 * caller's buffer untouched (all-or-nothing).
 */

import type { PatchableModel } from "../types"
import { op, type PatchOp } from "./core"
import { FirmwarePatchError } from "./errors"
import { bytesToHex } from "./py-compat"

type Pattern = ReadonlyArray<number | null>

interface Mss0Site {
  name: string
  offset: number
  final: Uint8Array
  /** Accepted current states (wildcard `null`); the final state is always accepted too. */
  predecessors: ReadonlyArray<Pattern | Uint8Array>
}

function bytes(values: ReadonlyArray<number | null>, length: number): Uint8Array {
  return Uint8Array.from(values, (value) => value ?? 0).slice(0, length)
}

const MI6_SITES: readonly Mss0Site[] = [
  {
    name: "enable_threshold",
    offset: 0x18ec,
    final: bytes([0x00, 0x29], 2),
    predecessors: [bytes([0x2d, 0x29], 2), bytes([0x32, 0x29], 2)],
  },
  {
    name: "enable_branch",
    offset: 0x18f2,
    final: bytes([0x03, 0xdb], 2),
    predecessors: [bytes([0x03, 0xdd], 2)],
  },
  {
    name: "launch_add",
    offset: 0x1d20,
    final: bytes([0x01, 0xf1, 0x0a, 0x05], 4),
    predecessors: [[0xa1, 0xf1, null, 0x05]],
  },
  {
    name: "launch_scale",
    offset: 0x1d28,
    final: bytes([0xa0, 0x26], 2),
    predecessors: [bytes([0x78, 0x26], 2)],
  },
  {
    name: "ramp_gate",
    offset: 0x1f30,
    final: bytes([0x00, 0x29], 2),
    predecessors: [bytes([0x1e, 0x29], 2), bytes([0x32, 0x29], 2)],
  },
  {
    name: "ramp_branch",
    offset: 0x1f32,
    final: bytes([0xbf, 0xf6, 0xf3, 0xae], 4),
    predecessors: [bytes([0x3f, 0xf7, 0xf3, 0xae], 4)],
  },
  {
    name: "latch_release",
    offset: 0x7a20,
    final: bytes([0x00, 0x20], 2),
    predecessors: [bytes([0x00, 0x88], 2)],
  },
  {
    name: "latch_rearm",
    offset: 0x7a2a,
    final: bytes([0x00, 0x2b], 2),
    predecessors: [bytes([0x1e, 0x2b], 2)],
  },
]

const MI6LITE_SITES: readonly Mss0Site[] = [
  {
    name: "latch_release",
    offset: 0x7dc6,
    final: bytes([0x00, 0x2d], 2),
    predecessors: [bytes([0x2d, 0x2d], 2)],
  },
  {
    name: "latch_rearm",
    offset: 0x7dce,
    final: bytes([0x00, 0x2d], 2),
    predecessors: [bytes([0x1e, 0x2d], 2)],
  },
  {
    name: "ramp_gate",
    offset: 0x217e,
    final: bytes([0x00, 0x2a], 2),
    predecessors: [bytes([0x1e, 0x2a], 2)],
  },
  {
    name: "ramp_branch",
    offset: 0x2180,
    final: bytes([0x6e, 0xdb], 2),
    predecessors: [bytes([0x6e, 0xdd], 2)],
  },
  {
    name: "launch_add",
    offset: 0x2186,
    final: bytes([0x02, 0xf1, 0x0a, 0x05], 4),
    predecessors: [bytes([0xa2, 0xf1, 0x1e, 0x05], 4)],
  },
  {
    name: "launch_scale",
    offset: 0x218e,
    final: bytes([0xa0, 0x26], 2),
    predecessors: [bytes([0x78, 0x26], 2)],
  },
]

export const MSS0_BODY_OFFSETS: Readonly<Record<"mi6" | "mi6lite", readonly number[]>> = {
  mi6: MI6_SITES.map((site) => site.offset),
  mi6lite: MI6LITE_SITES.map((site) => site.offset),
}

export function isMss0Model(model: string): model is "mi6" | "mi6lite" {
  return model === "mi6" || model === "mi6lite"
}

function matchesPattern(current: Uint8Array, pattern: Pattern | Uint8Array): boolean {
  if (current.length !== pattern.length) return false
  for (let i = 0; i < pattern.length; i++) {
    const expected = pattern[i]
    if (expected !== null && expected !== undefined && current[i] !== expected) return false
  }
  return true
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

/**
 * Apply the coherent-latch MSS0 writes to a decoded N32 body.
 *
 * @throws FirmwarePatchError("unexpected_bytes") when a site holds an unknown state.
 */
export function applyMss0ToBody(
  body: Uint8Array,
  model: PatchableModel
): { data: Uint8Array; log: PatchOp[] } {
  if (!isMss0Model(model)) {
    throw new FirmwarePatchError("unsupported_model", "mss0exp exists only for mi6 and mi6lite")
  }

  const sites = model === "mi6" ? MI6_SITES : MI6LITE_SITES
  const out = body.slice()
  const log: PatchOp[] = []

  for (const site of sites) {
    if (site.offset + site.final.length > out.length) {
      throw new FirmwarePatchError(
        "container_invalid",
        `mss0exp site ${site.name} @0x${site.offset.toString(16)} is outside the firmware body`
      )
    }
    const current = out.slice(site.offset, site.offset + site.final.length)
    if (sameBytes(current, site.final)) continue

    const accepted =
      site.predecessors.some((pattern) => matchesPattern(current, pattern)) ||
      sameBytes(current, site.final)
    if (!accepted) {
      throw new FirmwarePatchError(
        "unexpected_bytes",
        `mss0exp site ${site.name} @0x${site.offset.toString(16)}: unexpected bytes ${bytesToHex(
          current
        )}`,
        { patch: "mss0exp", detail: bytesToHex(current) }
      )
    }

    out.set(site.final, site.offset)
    log.push(op(`mss0exp_${site.name}`, site.offset, bytesToHex(current), bytesToHex(site.final)))
  }

  return { data: out, log }
}
