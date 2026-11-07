import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"

import { CoreN32Patcher } from "./core-n32"
import { applyFirmwarePatches } from "./pipeline"
import { fixturesAvailable, readFixture } from "./test-helpers"

const sha256 = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex")

function bodySize(full: Uint8Array): number {
  return (full[0x0e] ?? 0) | ((full[0x0f] ?? 0) << 8)
}

function decodeBody(full: Uint8Array): Uint8Array {
  const size = bodySize(full)
  const out = new Uint8Array(size)
  for (let i = 0; i < size; i++) out[i] = (full[0x80 + i] ?? 0) ^ 0xaa
  return out
}

describe.skipIf(!fixturesAvailable())("N32 full-image container", () => {
  it("extracts, decrypts and re-inserts a real full image", () => {
    const input = readFixture("mi6-base-factory")
    const size = bodySize(input)

    const [body, header, footer] = CoreN32Patcher.extractFirmwareFromImage(input, 0xa800)
    expect(header.length).toBe(0x80)
    expect(body.length).toBe(size)
    expect(header.length + body.length + footer.length).toBe(input.length)

    const rebuilt = CoreN32Patcher.insertFirmwareIntoImage(body, header, footer, 0xa800)
    expect(sha256(rebuilt)).toBe(sha256(input))
  })

  it("detects encryption from a valid embedded CRC and decrypts XOR 0xAA", () => {
    const input = readFixture("mi6-base-factory")
    const patcher = new CoreN32Patcher(input)
    expect(patcher.wasEncrypted).toBe(true)
    expect(patcher.data.length).toBe(bodySize(input))
    expect(sha256(patcher.data)).toBe(sha256(decodeBody(input)))
    expect(patcher.imageHeader?.length).toBe(0x80)
    expect(patcher.imageFooter?.length).toBe(input.length - 0x80 - bodySize(input))
  })

  it("exposes the dynamic header size (0xB000 for mi6lite)", () => {
    const input = readFixture("mi6lite-factory")
    const patcher = new CoreN32Patcher(input)
    expect(patcher.headerFirmwareSize).toBe(0xb000)
    expect(patcher.data.length).toBe(0xb000)
  })

  it("accepts a raw encrypted body and reproduces the Python raw-body output", () => {
    const input = readFixture("mi6-base-factory")
    const raw = input.slice(0x80, 0x80 + bodySize(input))
    const result = applyFirmwarePatches(raw, "mi6", [{ code: "sls", value: 35 }])
    // Python bw-patcher v1.1.6 on the same raw body: sls=35 + chk.
    expect(sha256(result.data)).toBe(
      "7e10eedc8cd991ef85929d2c40e3f7a9aefcfc7b1f89476a8a141af72621be7e"
    )
    expect(result.data.length).toBe(bodySize(input))
    // The output was produced by the same encrypt-then-CRC path as Python; the hash above is
    // the byte-for-byte contract. A fresh patcher must detect the result as a valid encrypted body.
    expect(CoreN32Patcher.isEncryptedData(result.data, null, 0xa800)).toBe(true)
  })

  it("reproduces the Python raw-body output for mi6lite", () => {
    const input = readFixture("mi6lite-factory")
    const raw = input.slice(0x80, 0x80 + bodySize(input))
    const result = applyFirmwarePatches(raw, "mi6lite", [{ code: "sls", value: 35 }])
    expect(sha256(result.data)).toBe(
      "34c10493140d400c29a4b1d6a5a7c672e69c21ab39a3e29143315fd842a98d92"
    )
  })

  it("rejects a firmware/header size mismatch on insertion", () => {
    const input = readFixture("mi6-base-factory")
    const size = bodySize(input)
    const [body, header, footer] = CoreN32Patcher.extractFirmwareFromImage(input, 0xa800)
    expect(body.length).toBe(size)
    expect(() =>
      CoreN32Patcher.insertFirmwareIntoImage(body.slice(0, body.length - 2), header, footer, 0xa800)
    ).toThrow()
    expect(() =>
      CoreN32Patcher.insertFirmwareIntoImage(body, header.slice(0, 0x40), footer, 0xa800)
    ).toThrow()
  })
})
