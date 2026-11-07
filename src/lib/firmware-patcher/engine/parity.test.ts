import { createHash } from "node:crypto"

import { describe, expect, it } from "vitest"

import type { PatchSelectionEntry } from "../types"
import { applyFirmwarePatches } from "./pipeline"
import { PARITY_GOLDENS, fixturesAvailable, readFixture } from "./test-helpers"

const sha256 = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex")

describe.skipIf(!fixturesAvailable())("engine parity with pinned Python (mi6 / mi6lite)", () => {
  it.each(PARITY_GOLDENS.vectors)("$id", (golden) => {
    const input = readFixture(golden.fixtureId)
    expect(sha256(input)).toBe(golden.inputSha256)

    const result = applyFirmwarePatches(
      input,
      golden.model,
      golden.selection as PatchSelectionEntry[],
      {
        fullDump: golden.fullDump,
        allowExperimental: golden.allowExperimental,
      }
    )

    expect(sha256(result.data)).toBe(golden.outputSha256)
    expect(result.data.length).toBe(golden.outputSize)
    expect(result.log).toEqual(golden.log)
  })
})
