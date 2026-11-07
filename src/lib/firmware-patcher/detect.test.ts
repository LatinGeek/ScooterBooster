import { describe, expect, it } from "vitest"

import { detectBytes, detectFirmware } from "./detect"
import { PARITY_GOLDENS, fixturesAvailable, readFixture } from "./engine/test-helpers"

function fillAscii(data: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) data[offset + i] = text.charCodeAt(i)
}

function leqi(product: number, family: number, size: number, eu2 = false): Uint8Array {
  const data = new Uint8Array(0x1000)
  fillAscii(data, 0x0a, "EU1\0")
  data[0x02] = family & 0xff
  data[0x03] = (family >> 8) & 0xff
  data[0x0e] = size & 0xff
  data[0x0f] = (size >> 8) & 0xff
  data[0x1c] = (product >> 8) & 0xff
  data[0x1d] = product & 0xff
  if (eu2) fillAscii(data, 0x20, "EU2\0")
  return data
}

function packaged(id: string, ver = "0001"): Uint8Array {
  const data = new Uint8Array(0x1000)
  data[0] = 1
  data[2] = 2
  fillAscii(data, 0x12, ver)
  fillAscii(data, 0x22, id)
  return data
}

function raw(marker: string): Uint8Array {
  const data = new Uint8Array(0x1000)
  fillAscii(data, 0x10, marker)
  return data
}

describe("detectBytes: LEQI", () => {
  it("resolves mi6 from product, size, family and EU2", () => {
    const det = detectBytes(leqi(0x012e, 0x0101, 0xa800, true))
    expect(det.family).toBe("leqi")
    expect(det.container).toBe("eu1")
    expect(det.best).toBe("mi6")
    expect(det.ok).toBe(true)
    expect(det.bwpatcher).toBe(true)
    expect(det.hits[0]?.score).toBe(135)
    expect(det.hits[0]?.reasons).toContain("+50 product@0x1C=0x012E")
  })

  it("resolves mi6lite from the ambiguous product via size", () => {
    const det = detectBytes(leqi(0x008c, 0x0201, 0xb000))
    expect(det.best).toBe("mi6lite")
    expect(det.ok).toBe(true)
  })

  it("resolves mi5elite from the ambiguous family via size", () => {
    const det = detectBytes(leqi(0x008c, 0x0201, 0x9800))
    expect(det.best).toBe("mi5elite")
  })

  it("resolves mi5plus", () => {
    const det = detectBytes(leqi(0x0157, 0x0300, 0x8c00))
    expect(det.best).toBe("mi5plus")
  })

  it("never accepts 6esstl as patchable", () => {
    const det = detectBytes(leqi(0x008c, 0x0200, 0x6f00))
    expect(det.best).toBe("6esstl")
    expect(det.ok).toBe(false)
    expect(det.bwpatcher).toBe(false)
  })
})

describe("detectBytes: BrightWay packaged", () => {
  it("maps a direct id to mi5", () => {
    const det = detectBytes(packaged("001500010001"))
    expect(det.family).toBe("brightway")
    expect(det.container).toBe("packaged")
    expect(det.best).toBe("mi5")
    expect(det.ok).toBe(true)
  })

  it("maps a 4-character id prefix", () => {
    const det = detectBytes(packaged("000700990001"))
    expect(det.best).toBe("mi5pro")
    expect(det.hits[0]?.score).toBe(25)
    expect(det.ok).toBe(false)
  })

  it("reports an unknown packaged id without a bogus model", () => {
    const det = detectBytes(packaged("999999999999"))
    expect(det.best).toBeNull()
    expect(det.notes.join(" ")).toContain("unknown id@0x22=999999999999")
  })

  it("reports non-patcher labels without ok", () => {
    const det = detectBytes(packaged("001320122002"))
    expect(det.best).toBe("t2201")
    expect(det.ok).toBe(false)
    expect(det.notes.join(" ")).toContain("t2201 is not a bwpatcher module")
  })
})

describe("detectBytes: raw marker dumps", () => {
  it("identifies mi5max", () => {
    const det = detectBytes(raw("LKS32MC071CBT8FFP"))
    expect(det.container).toBe("raw")
    expect(det.best).toBe("mi5max")
    expect(det.ok).toBe(true)
  })

  it("records ties instead of guessing (LKS32MC081)", () => {
    const det = detectBytes(raw("LKS32MC081"))
    expect(det.best).toBeNull()
    expect(det.ok).toBe(false)
    expect(det.notes.join(" ")).toContain("tied:")
    expect(det.notes.join(" ")).toContain("mi4=15")
    expect(det.notes.join(" ")).toContain("ultra4=15")
  })

  it("records ties for SZMC-ES-ZM-0283M", () => {
    const det = detectBytes(raw("SZMC-ES-ZM-0283M"))
    expect(det.best).toBeNull()
    expect(det.notes.join(" ")).toContain("mi4pro2nd")
    expect(det.notes.join(" ")).toContain("mi5pro")
  })
})

describe("detectBytes: malformed inputs never throw", () => {
  it.each([
    ["empty", new Uint8Array(0)],
    ["short", new Uint8Array(3)],
    ["truncated tag", Uint8Array.of(0x45, 0x55, 0x31)],
  ])("%s", (_label, data) => {
    const det = detectBytes(data)
    expect(det.best).toBeNull()
    expect(det.ok).toBe(false)
  })
})

describe("detectFirmware (shipping gate)", () => {
  it("returns the model only when it is shipped under G5", () => {
    const det = detectFirmware(leqi(0x012e, 0x0101, 0xa800, true))
    expect(det.supported).toBe(true)
    expect(det.model).toBe("mi6")
    expect(det.displayName).toBe("Mi 6")
  })

  it("keeps synthetic-only models detectable but unsupported", () => {
    const det = detectFirmware(packaged("001500010001"))
    expect(det.best).toBe("mi5")
    expect(det.model).toBeNull()
    expect(det.supported).toBe(false)
  })
})

describe.skipIf(!fixturesAvailable())("detection parity with the pinned Python reference", () => {
  it.each(PARITY_GOLDENS.detections)("$id", (golden) => {
    const data = readFixture(golden.fixtureId)
    const det = detectBytes(data)
    expect(det).toEqual(golden.detection)
    const enriched = detectFirmware(data)
    expect(enriched.best).toBe(golden.detection.best)
    expect(enriched.supported).toBe(true)
  })
})
