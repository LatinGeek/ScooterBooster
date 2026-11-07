import { describe, expect, it } from "vitest"

import {
  bitReverse8,
  bitReverse16,
  crc16Ccitt,
  crc16CcittBytes,
  crc16N32,
  crc32Lks32,
  crc32Lks32Bytes,
} from "./crc"

function hex(data: Uint8Array): string {
  return Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("")
}

const ascii = (text: string): Uint8Array => Uint8Array.from(text, (c) => c.charCodeAt(0))

// Cross-checked against the pinned Python reference (crcmod 1.7 / core_n32.py).
const VECTORS = [
  { name: "empty", data: new Uint8Array(0), ccitt: 0x0000, lks32: 0xffffffff, n32: 0xffff },
  { name: "00", data: Uint8Array.of(0x00), ccitt: 0x0000, lks32: 0x8f60a07b, n32: 0x40bf },
  { name: "ff", data: Uint8Array.of(0xff), ccitt: 0x1ef0, lks32: 0x00000000, n32: 0x00ff },
  {
    name: "123456789",
    data: ascii("123456789"),
    ccitt: 0x31c3,
    lks32: 0xe6409d9d,
    n32: 0x4b37,
  },
  {
    name: "range(32)",
    data: Uint8Array.from({ length: 32 }, (_, i) => i),
    ccitt: 0xd2ff,
    lks32: 0x8f819950,
    n32: 0x576b,
  },
  {
    name: "mixed",
    data: Uint8Array.of(
      0x10,
      0x20,
      0x30,
      0x40,
      0x50,
      0x60,
      0x70,
      0x80,
      0x90,
      0xa0,
      0xb0,
      0xc0,
      0xd0,
      0xe0,
      0xf0,
      0x01,
      0x02
    ),
    ccitt: 0x65de,
    lks32: 0x44d342f7,
    n32: 0xc588,
  },
]

describe("CRC-16/CCITT (core.py)", () => {
  it.each(VECTORS)("$name", ({ data, ccitt }) => {
    expect(crc16Ccitt(data)).toBe(ccitt)
  })

  it("stores the result big-endian", () => {
    expect(hex(crc16CcittBytes(ascii("123456789")))).toBe("31c3")
  })
})

describe("LKS32 CRC-32 (core_lks32.py)", () => {
  it.each(VECTORS)("$name", ({ data, lks32 }) => {
    expect(crc32Lks32(data)).toBe(lks32)
  })

  it("pads with 0xFF to a multiple of four and stores little-endian", () => {
    // 9-byte input -> 3 bytes of 0xFF padding, matching the Python reference.
    expect(hex(crc32Lks32Bytes(ascii("123456789")))).toBe("9d9d40e6")
    expect(crc32Lks32(ascii("123456789"))).toBe(
      crc32Lks32(Uint8Array.of(...ascii("123456789"), 0xff, 0xff, 0xff))
    )
  })
})

describe("N32 CRC-16 with bit reversal (core_n32.py)", () => {
  it.each(VECTORS)("$name", ({ data, n32 }) => {
    expect(crc16N32(data)).toBe(n32)
  })
})

describe("bit reversal", () => {
  it("reverses 8 and 16 bit values", () => {
    expect(bitReverse8(0b00000001)).toBe(0b10000000)
    expect(bitReverse8(0xaa)).toBe(0x55)
    expect(bitReverse16(0x0001)).toBe(0x8000)
    expect(bitReverse16(0x1234)).toBe(0x2c48)
    expect(bitReverse16(bitReverse16(0xbeef))).toBe(0xbeef)
  })
})
