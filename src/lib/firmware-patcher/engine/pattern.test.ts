import { describe, expect, it } from "vitest"

import { SignatureNotFoundError } from "./errors"
import { findPattern, hasPattern } from "./pattern"

const data = Uint8Array.of(1, 2, 3, 4, 5, 2, 3, 9)

describe("findPattern (upstream find_pattern semantics)", () => {
  it("finds the first match", () => {
    expect(findPattern(data, [2, 3])).toBe(1)
  })

  it("honours start", () => {
    expect(findPattern(data, [2, 3], null, 2)).toBe(5)
  })

  it("supports None wildcards", () => {
    expect(findPattern(data, [2, null])).toBe(1)
    expect(findPattern(data, [null, null, 3])).toBe(0)
  })

  it("supports masks", () => {
    const bytes = Uint8Array.of(0x10, 0x20, 0x00)
    const signature = [0x10, 0x20]
    const mask = [0xf0, 0xf0]
    expect(findPattern(bytes, signature, mask)).toBe(0)
  })

  it("reproduces the upstream off-by-one: the final byte is never a start", () => {
    expect(() => findPattern(Uint8Array.of(1, 2, 3), [3])).toThrow(SignatureNotFoundError)
    // A two-byte signature that fits exactly is also rejected.
    expect(() => findPattern(Uint8Array.of(1, 2), [1, 2])).toThrow(SignatureNotFoundError)
  })

  it("honours maxit as an exclusive window", () => {
    const bytes = Uint8Array.of(0, 1, 2, 1, 2)
    expect(findPattern(bytes, [1, 2], null, 3, 1)).toBe(3)
    expect(() => findPattern(bytes, [1, 2], null, 3, 0)).toThrow(SignatureNotFoundError)
  })

  it("throws SignatureNotFoundError and offers a boolean helper", () => {
    expect(() => findPattern(data, [9])).toThrow(SignatureNotFoundError)
    expect(hasPattern(data, [9])).toBe(false)
    expect(hasPattern(data, [2, 3])).toBe(true)
  })

  it("rejects a mask of the wrong length", () => {
    expect(() => findPattern(data, [1], [0xff, 0xff])).toThrow(/mask must be as long/)
  })
})
