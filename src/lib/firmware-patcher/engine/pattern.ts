/**
 * Byte-pattern helpers — exact port of bwpatcher/utils.py at the pinned commit.
 *
 * `findPattern` deliberately reproduces the upstream off-by-one (`range(start, stop)` with
 * `stop = len(data) - len(signature)`): a signature that only fits in the final byte is never
 * matched. Changing that would silently diverge from upstream on adversarial inputs.
 */

import { SignatureNotFoundError } from "./errors"

/** A signature byte, or `null` for a wildcard (upstream `None`). */
export type Signature = ReadonlyArray<number | null>

/**
 * Upstream `find_pattern(data, signature, mask=None, start=None, maxit=None)`.
 *
 * @throws SignatureNotFoundError when no match exists.
 */
export function findPattern(
  data: Uint8Array,
  signature: Signature,
  mask?: ReadonlyArray<number> | null,
  start?: number | null,
  maxit?: number | null
): number {
  const sigLen = signature.length
  let from = start ?? 0
  const stop = maxit != null ? from + maxit : data.length - sigLen
  if (mask) {
    if (mask.length !== sigLen) {
      throw new Error("mask must be as long as the signature!")
    }
  }
  if (from < 0) from = 0

  for (let i = from; i < stop; i++) {
    let matches = 0
    for (;;) {
      const expected = signature[matches]
      if (expected === undefined) break
      const actual = (data[i + matches] ?? 0) & (mask ? (mask[matches] ?? 0xff) : 0xff)
      if (expected !== null && expected !== actual) break
      matches++
      if (matches === sigLen) return i
    }
  }
  throw new SignatureNotFoundError()
}

/** True when `findPattern` would succeed (never throws for a missing pattern). */
export function hasPattern(
  data: Uint8Array,
  signature: Signature,
  mask?: ReadonlyArray<number> | null,
  start?: number | null,
  maxit?: number | null
): boolean {
  try {
    findPattern(data, signature, mask, start, maxit)
    return true
  } catch (error) {
    if (error instanceof SignatureNotFoundError) return false
    throw error
  }
}

/**
 * Upstream `offset_to_nearest_word`: advance by two bytes until the address is 4-byte aligned.
 * Upstream would loop forever for an odd offset; we stop immediately to fail loudly instead.
 */
export function offsetToNearestWord(offset: number): number {
  if (offset % 2 !== 0) {
    throw new Error(`offset_to_nearest_word expects an even offset, got 0x${offset.toString(16)}`)
  }
  let ofs = offset
  while (ofs % 4 !== 0) ofs += 2
  return ofs
}

/** Upstream `extract_ldr_offset`: parse `[pc, #0x1dc]` out of a disassembly string. */
export function extractLdrOffset(instruction: string | null | undefined): number | null {
  if (!instruction) return null
  const match = /\[pc,\s*#(0x[0-9a-fA-F]+)\]/.exec(instruction)
  if (!match) return null
  return Number.parseInt(match[1] ?? "", 16)
}

/** Upstream `get_reg(disasm, default="r1")`. */
export function getReg(disassembly: string | null | undefined, fallback = "r1"): string {
  try {
    const operand = (disassembly ?? "").split("\t")[1]?.split(",")[0]
    return operand && operand.length > 0 ? operand : fallback
  } catch {
    return fallback
  }
}
