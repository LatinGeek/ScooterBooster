import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { PATCHABLE_MODELS, type PatchSelectionEntry } from "../types"
import { FirmwarePatchError } from "./errors"
import { applyFirmwarePatches, normalizeSelection } from "./pipeline"
import { MODEL_PATCHERS } from "./registry"
import { fixturesAvailable, readFixture } from "./test-helpers"

const dummy = Uint8Array.of(1, 2, 3, 4)

function expectCode(fn: () => unknown, code: string): void {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(FirmwarePatchError)
    expect((error as FirmwarePatchError).code).toBe(code)
    return
  }
  throw new Error("expected a FirmwarePatchError")
}

describe("static model dispatch", () => {
  it("has exactly one static patcher per patchable model", () => {
    expect(Object.keys(MODEL_PATCHERS).sort()).toEqual([...PATCHABLE_MODELS].sort())
    for (const model of PATCHABLE_MODELS) {
      expect(typeof MODEL_PATCHERS[model]).toBe("function")
    }
  })
})

describe("selection validation", () => {
  it("rejects an unknown model", () => {
    expectCode(() => applyFirmwarePatches(dummy, "mi9", []), "unsupported_model")
  })

  it("rejects empty input", () => {
    expectCode(() => applyFirmwarePatches(new Uint8Array(0), "mi6", []), "invalid_input")
  })

  it("never accepts server-managed chk/img from the client", () => {
    expectCode(
      () => applyFirmwarePatches(dummy, "mi6", [{ code: "chk" as never }]),
      "invalid_selection"
    )
    expectCode(
      () => applyFirmwarePatches(dummy, "mi6", [{ code: "img" as never }]),
      "invalid_selection"
    )
  })

  it("rejects duplicate codes", () => {
    expectCode(
      () =>
        applyFirmwarePatches(dummy, "mi6", [
          { code: "sls", value: 25 },
          { code: "sls", value: 30 },
        ]),
      "invalid_selection"
    )
  })

  it("rejects model-inapplicable patches", () => {
    expectCode(
      () => applyFirmwarePatches(dummy, "mi4", [{ code: "slp", value: 6 }]),
      "invalid_selection"
    )
  })

  it("requires allowExperimental for experimental patches", () => {
    expectCode(
      () => applyFirmwarePatches(dummy, "mi6", [{ code: "mss", value: 5 }]),
      "experimental_not_allowed"
    )
    expectCode(
      () => applyFirmwarePatches(dummy, "mi6", [{ code: "mss0exp", value: true }]),
      "experimental_not_allowed"
    )
  })

  it("validates numeric ranges and fdv shape", () => {
    expectCode(
      () => applyFirmwarePatches(dummy, "mi6", [{ code: "sls", value: 0 }]),
      "invalid_selection"
    )
    expectCode(
      () => applyFirmwarePatches(dummy, "mi6", [{ code: "sls", value: 36 }]),
      "invalid_selection"
    )
    expectCode(
      () => applyFirmwarePatches(dummy, "mi4", [{ code: "fdv", value: "12a4" }]),
      "invalid_selection"
    )
    expect(() => normalizeSelection("mi4", [{ code: "fdv", value: 42 }])).not.toThrow()
  })

  it("normalises fdv numbers to four digits and sorts canonically", () => {
    const normalised = normalizeSelection("mi4", [
      { code: "cce", value: true },
      { code: "fdv", value: 42 },
      { code: "sls", value: 25 },
    ])
    expect(normalised.map((entry) => entry.code)).toEqual(["sls", "fdv", "cce"])
    expect(normalised[1]?.value).toBe("0042")
  })

  it("drops boolean false (unchecked) entries", () => {
    expect(normalizeSelection("mi4", [{ code: "cce", value: false }])).toEqual([])
  })
})

describe("canonical order and server-managed patches", () => {
  it("orders user patches then chk then img", () => {
    const normalised = normalizeSelection("mi6", [
      { code: "slp", value: 15 },
      { code: "sls", value: 35 },
      { code: "sld", value: 25 },
    ])
    expect(normalised.map((entry) => entry.code)).toEqual(["sls", "sld", "slp"])
  })
})

describe.skipIf(!fixturesAvailable())("engine behaviour on real firmware", () => {
  const input = readFixture("mi6-base-factory")
  const selection: PatchSelectionEntry[] = [
    { code: "sls", value: 35 },
    { code: "sld", value: 25 },
    { code: "slp", value: 15 },
  ]

  it("is deterministic and does not mutate the input", () => {
    const before = input.slice()
    const a = applyFirmwarePatches(input, "mi6", selection)
    const b = applyFirmwarePatches(input, "mi6", selection)
    expect(a.data).toEqual(b.data)
    expect(a.log).toEqual(b.log)
    expect(input).toEqual(before)
  })

  it("appends chk/img and skips chk in full-dump mode", () => {
    const normal = applyFirmwarePatches(input, "mi6", selection)
    expect(normal.applied).toEqual(["sls", "sld", "slp", "chk", "img"])
    expect(normal.log.some((entry) => entry.name === "fix_checksum")).toBe(true)

    const fullDump = applyFirmwarePatches(input, "mi6", selection, { fullDump: true })
    expect(fullDump.applied).toEqual(["sls", "sld", "slp", "img"])
    expect(fullDump.log.some((entry) => entry.name === "fix_checksum")).toBe(false)
    expect(fullDump.data).not.toEqual(normal.data)
  })

  it("is all-or-nothing when a signature is missing", () => {
    const corrupt = input.slice()
    corrupt[0x80 + 0x2a7a] = (corrupt[0x80 + 0x2a7a] ?? 0) ^ 0xff // break the speed-calc anchor
    const before = corrupt.slice()
    expect(() => applyFirmwarePatches(corrupt, "mi6", selection)).toThrowError(FirmwarePatchError)
    expect(corrupt).toEqual(before)
  })

  it("rejects an unsupported state before producing output", () => {
    expectCode(
      () => applyFirmwarePatches(input, "mi6", [{ code: "dms", value: 22 }]),
      "invalid_selection"
    )
  })
})

describe("server-only engine", () => {
  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry)
      return statSync(path).isDirectory() ? walk(path) : [path]
    })
  }

  it("contains no client directives or React/Next imports", () => {
    const root = join(process.cwd(), "src", "lib", "firmware-patcher")
    // `server/` is the API-owned transport layer (route helpers) and is intentionally Next-coupled;
    // the invariant below applies to the engine surface only.
    const serverLayer = join(root, "server")
    const files = walk(root).filter(
      (path) =>
        !path.startsWith(serverLayer) &&
        path.endsWith(".ts") &&
        !path.endsWith(".test.ts") &&
        !path.includes("__fixtures__")
    )
    expect(files.length).toBeGreaterThan(20)
    for (const file of files) {
      const source = readFileSync(file, "utf8")
      expect(source).not.toContain('"use client"')
      expect(source).not.toContain('"use server"')
      expect(source).not.toMatch(/from\s+["']react["']/)
      expect(source).not.toMatch(/from\s+["']next\//)
    }
  })
})
