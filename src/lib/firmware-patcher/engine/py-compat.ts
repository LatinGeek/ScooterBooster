/**
 * Small helpers reproducing the Python semantics the upstream patchers rely on
 * (slicing with negative indices, slice assignment that can resize, banker's rounding,
 * hex(), int.to_bytes). Byte buffers are plain Uint8Array.
 */

import { FirmwarePatchError, PyIndexError } from "./errors"

/** Python `round()` on a float: round-half-to-even, returns an integer-valued number. */
export function pyRound(x: number): number {
  const f = Math.floor(x)
  const diff = x - f
  if (diff < 0.5) return f
  if (diff > 0.5) return f + 1
  return f % 2 === 0 ? f : f + 1
}

/** Python `int(x)` on a float (truncation toward zero). */
export function pyInt(x: number): number {
  return Math.trunc(x)
}

/** Python `hex(n)`: lower-case, "0x" prefix, "-0x.." for negatives. */
export function pyHex(n: number): string {
  return n < 0 ? `-0x${(-n).toString(16)}` : `0x${n.toString(16)}`
}

export function bytesToHex(data: Uint8Array): string {
  let out = ""
  for (let i = 0; i < data.length; i++) out += (data[i] ?? 0).toString(16).padStart(2, "0")
  return out
}

export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || /[^0-9a-fA-F]/.test(hex)) {
    throw new FirmwarePatchError("invalid_input", "invalid hex string")
  }
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  let total = 0
  for (const p of parts) total += p.length
  const out = new Uint8Array(total)
  let pos = 0
  for (const p of parts) {
    out.set(p, pos)
    pos += p.length
  }
  return out
}

/** Python `int.to_bytes(size, "little")`; raises on overflow / negative values (OverflowError). */
export function intToBytesLE(value: number, size: number): Uint8Array {
  if (!Number.isInteger(value) || value < 0 || value >= 2 ** (8 * size)) {
    throw new FirmwarePatchError("patch_failed", "int too big to convert")
  }
  const out = new Uint8Array(size)
  let v = value
  for (let i = 0; i < size; i++) {
    out[i] = v % 256
    v = Math.floor(v / 256)
  }
  return out
}

/** Python `data[i]` read: negative index wraps, out of range raises IndexError. */
export function pyAt(data: Uint8Array, index: number): number {
  const i = index < 0 ? index + data.length : index
  const v = i >= 0 && i < data.length ? data[i] : undefined
  if (v === undefined) throw new PyIndexError()
  return v
}

function normBound(value: number | undefined, len: number, dflt: number): number {
  if (value === undefined) return dflt
  let v = value < 0 ? value + len : value
  if (v < 0) v = 0
  if (v > len) v = len
  return v
}

/** Python `data[start:stop]` (copy). Negative bounds wrap, out-of-range bounds clamp. */
export function pySlice(data: Uint8Array, start?: number, stop?: number): Uint8Array {
  const s = normBound(start, data.length, 0)
  const e = normBound(stop, data.length, data.length)
  return e <= s ? new Uint8Array(0) : data.slice(s, e)
}

/**
 * Python `data[start:stop] = repl` on a bytearray: the slice is replaced and the buffer
 * grows/shrinks when lengths differ. Returns the (possibly new) buffer.
 */
export function pyAssignSlice(
  data: Uint8Array,
  start: number | undefined,
  stop: number | undefined,
  repl: Uint8Array
): Uint8Array {
  const s = normBound(start, data.length, 0)
  let e = normBound(stop, data.length, data.length)
  if (e < s) e = s
  if (e - s === repl.length) {
    data.set(repl, s)
    return data
  }
  const out = new Uint8Array(data.length - (e - s) + repl.length)
  out.set(data.subarray(0, s), 0)
  out.set(repl, s)
  out.set(data.subarray(e), s + repl.length)
  return out
}
