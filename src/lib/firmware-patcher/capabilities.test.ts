import { describe, expect, it } from "vitest"

import {
  CAPABILITIES_UPSTREAM,
  CAPABILITY_MATRIX,
  SHIPPED_MODELS,
  getModelCapability,
  isModelShipped,
} from "./capabilities"
import { normalizeSelection } from "./engine/pipeline"
import { FirmwarePatchError } from "./engine/errors"
import {
  PATCH_CODES,
  PATCHABLE_MODELS,
  UPSTREAM_PIN,
  isLeqiModel,
  type PatchCode,
  type PatchableModel,
} from "./types"

function sampleValue(model: PatchableModel, code: PatchCode): number | string | boolean {
  const capability = getModelCapability(model).patches[code]
  if (capability.valueKind === "boolean") return true
  if (capability.valueKind === "version") return "1234"
  const min = capability.min ?? 1
  const max = capability.max ?? 9
  return Math.round(((min + max) / 2) * 10) / 10
}

describe("generated capability matrix", () => {
  it("is pinned to the same upstream commit as types.ts", () => {
    expect(CAPABILITIES_UPSTREAM.commit).toBe(UPSTREAM_PIN.commit)
    expect(CAPABILITIES_UPSTREAM.version).toBe(UPSTREAM_PIN.version)
  })

  it("has exactly the 11 patchable models", () => {
    expect(Object.keys(CAPABILITY_MATRIX).sort()).toEqual([...PATCHABLE_MODELS].sort())
  })

  it("has every canonical patch entry for every model", () => {
    for (const model of PATCHABLE_MODELS) {
      const capability = getModelCapability(model)
      expect(capability.model).toBe(model)
      expect(Object.keys(capability.patches).sort()).toEqual([...PATCH_CODES].sort())
      for (const code of PATCH_CODES) {
        const patch = capability.patches[code]
        expect(patch.code).toBe(code)
        expect(patch.roles).toEqual(["admin", "technician"])
        expect(["supported", "experimental", "unsupported"]).toContain(patch.status)
      }
    }
  })

  it("marks mss0exp experimental only on mi6 and mi6lite", () => {
    for (const model of PATCHABLE_MODELS) {
      const patch = getModelCapability(model).patches.mss0exp
      if (model === "mi6" || model === "mi6lite") {
        expect(patch.status).toBe("experimental")
        expect(patch.valueKind).toBe("boolean")
        expect(patch.roles).toEqual(["admin", "technician"])
      } else {
        expect(patch.status).toBe("unsupported")
      }
    }
  })

  it("auto-appends img for Leqi models only", () => {
    for (const model of PATCHABLE_MODELS) {
      const capability = getModelCapability(model)
      expect(capability.autoPatches).toContain("chk")
      if (isLeqiModel(model)) expect(capability.autoPatches).toContain("img")
      else expect(capability.autoPatches).not.toContain("img")
    }
  })

  it("keeps synthetic-only models out of the shipping set (G5)", () => {
    expect([...SHIPPED_MODELS].sort()).toEqual(["mi6", "mi6lite"])
    for (const model of PATCHABLE_MODELS) {
      expect(isModelShipped(model)).toBe(model === "mi6" || model === "mi6lite")
    }
  })
})

describe("every model/patch combination is validated by the matrix", () => {
  for (const model of PATCHABLE_MODELS) {
    for (const code of PATCH_CODES) {
      const capability = getModelCapability(model).patches[code]
      it(`${model}/${code} (${capability.status})`, () => {
        const selection = [{ code, value: sampleValue(model, code) }]
        if (capability.status === "unsupported") {
          expect(() => normalizeSelection(model, selection, { allowExperimental: true })).toThrow(
            FirmwarePatchError
          )
          return
        }
        const normalised = normalizeSelection(model, selection, { allowExperimental: true })
        expect(normalised).toHaveLength(1)
        expect(normalised[0]?.code).toBe(code)
      })
    }
  }
})
