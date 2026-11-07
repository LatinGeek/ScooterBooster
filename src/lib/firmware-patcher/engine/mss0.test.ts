import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"

import { crc16N32 } from "../crc"
import type { PatchSelectionEntry } from "../types"
import { FirmwarePatchError } from "./errors"
import { applyMss0ToBody, MSS0_BODY_OFFSETS } from "./mss0"
import { applyFirmwarePatches } from "./pipeline"
import { fixturesAvailable, readFixture } from "./test-helpers"

const sha256 = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex")

const SPEED_SELECTION: PatchSelectionEntry[] = [
  { code: "sls", value: 35 },
  { code: "sld", value: 25 },
  { code: "slp", value: 15 },
]

interface Mss0Case {
  model: "mi6" | "mi6lite"
  fixtureId: string
  golden: string
  sites: Array<[number, string]>
}

const CASES: Mss0Case[] = [
  {
    model: "mi6",
    fixtureId: "mi6-base-factory",
    golden: "7a66169940c538eb3310136a5affa99d588c5a2c2d11b8e0ec5bedabc1c8d747",
    sites: [
      [0x18ec, "0029"],
      [0x18f2, "03db"],
      [0x1d20, "01f10a05"],
      [0x1d28, "a026"],
      [0x1f30, "0029"],
      [0x1f32, "bff6f3ae"],
      [0x7a20, "0020"],
      [0x7a2a, "002b"],
    ],
  },
  {
    model: "mi6lite",
    fixtureId: "mi6lite-factory",
    golden: "98f12702b11024472749f76d6305d32f99456babe740ea3cbf2fe1fecf0150db",
    sites: [
      [0x7dc6, "002d"],
      [0x7dce, "002d"],
      [0x217e, "002a"],
      [0x2180, "6edb"],
      [0x2186, "02f10a05"],
      [0x218e, "a026"],
    ],
  },
]

function bodySize(full: Uint8Array): number {
  return (full[0x0e] ?? 0) | ((full[0x0f] ?? 0) << 8)
}

function decodeBody(full: Uint8Array): Uint8Array {
  const size = bodySize(full)
  const out = new Uint8Array(size)
  for (let i = 0; i < size; i++) out[i] = (full[0x80 + i] ?? 0) ^ 0xaa
  return out
}

function hex(data: Uint8Array): string {
  return Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("")
}

describe.skipIf(!fixturesAvailable())("mss0exp golden vectors (SPEC §4.7)", () => {
  it.each(CASES)("$model exact bytes, CRC, hash and contained diff", (testCase) => {
    const input = readFixture(testCase.fixtureId)
    const base = applyFirmwarePatches(input, testCase.model, SPEED_SELECTION)
    const result = applyFirmwarePatches(
      input,
      testCase.model,
      [...SPEED_SELECTION, { code: "mss0exp", value: true }],
      { allowExperimental: true }
    )

    // 1. Exact final bytes at every listed body offset.
    const body = decodeBody(result.data)
    for (const [offset, expected] of testCase.sites) {
      expect(hex(body.subarray(offset, offset + expected.length / 2))).toBe(expected)
    }

    // 2. Golden SHA-256.
    expect(sha256(result.data)).toBe(testCase.golden)

    // 3. CRC is valid and was recomputed through the N32 path. The CRC is stored in the
    //    encrypted body (upstream encrypts first, then patches the CRC), so verify it there.
    const size = bodySize(result.data)
    const encryptedBody = result.data.slice(0x80, 0x80 + size)
    const embedded = ((encryptedBody[size - 2] ?? 0) << 8) | (encryptedBody[size - 1] ?? 0)
    expect(crc16N32(encryptedBody.subarray(0x40, size - 2))).toBe(embedded)

    // 4. Only the listed sites and CRC differ from the speed-only output.
    const allowed = new Set<number>()
    for (const [offset, expected] of testCase.sites) {
      for (let i = 0; i < expected.length / 2; i++) allowed.add(0x80 + offset + i)
    }
    allowed.add(0x80 + size - 2)
    allowed.add(0x80 + size - 1)
    expect(result.data.length).toBe(base.data.length)
    for (let i = 0; i < result.data.length; i++) {
      if (result.data[i] !== base.data[i]) expect(allowed.has(i)).toBe(true)
    }
    // Every allowed site actually changed (except already-final states).
    expect(MSS0_BODY_OFFSETS[testCase.model]).toEqual(testCase.sites.map(([offset]) => offset))
  })

  it.each(CASES)("$model is idempotent at the body level", (testCase) => {
    const input = readFixture(testCase.fixtureId)
    const result = applyFirmwarePatches(
      input,
      testCase.model,
      [...SPEED_SELECTION, { code: "mss0exp", value: true }],
      { allowExperimental: true }
    )
    const body = decodeBody(result.data)
    const again = applyMss0ToBody(body, testCase.model)
    expect(again.log).toEqual([])
    expect(hex(again.data)).toBe(hex(body))
  })

  it.each(CASES)("$model rejects an unknown predecessor state", (testCase) => {
    const input = readFixture(testCase.fixtureId)
    const base = applyFirmwarePatches(input, testCase.model, SPEED_SELECTION)
    const body = decodeBody(base.data)
    body[testCase.sites[0]?.[0] ?? 0] = 0x99
    expect(() => applyMss0ToBody(body, testCase.model)).toThrowError(FirmwarePatchError)
    try {
      applyMss0ToBody(body, testCase.model)
    } catch (error) {
      expect((error as FirmwarePatchError).code).toBe("unexpected_bytes")
    }
  })

  it("mss0exp supersedes the normal mss value", () => {
    const input = readFixture("mi6-base-factory")
    const withMss = applyFirmwarePatches(
      input,
      "mi6",
      [...SPEED_SELECTION, { code: "mss", value: 9 }, { code: "mss0exp", value: true }],
      { allowExperimental: true }
    )
    expect(sha256(withMss.data)).toBe(
      "7a66169940c538eb3310136a5affa99d588c5a2c2d11b8e0ec5bedabc1c8d747"
    )
    expect(withMss.applied).not.toContain("mss")
  })

  it("requires allowExperimental and only exists for mi6/mi6lite", () => {
    const input = readFixture("mi6-base-factory")
    expect(() =>
      applyFirmwarePatches(input, "mi6", [{ code: "mss0exp", value: true }])
    ).toThrowError(FirmwarePatchError)

    expect(() =>
      applyFirmwarePatches(input, "mi4", [{ code: "mss0exp", value: true }], {
        allowExperimental: true,
      })
    ).toThrowError(FirmwarePatchError)
  })
})
