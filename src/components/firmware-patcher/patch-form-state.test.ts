import { describe, expect, it } from "vitest"
import type { PatchCapability } from "./api-types"
import {
  createInitialPatchFormState,
  evaluatePatchForm,
  isPatchLocked,
  visiblePatches,
} from "./patch-form-state"

const PATCHES: PatchCapability[] = [
  { code: "cce", status: "supported", kind: "boolean" },
  { code: "mss0exp", status: "experimental", kind: "boolean" },
  { code: "mss", status: "experimental", kind: "number", min: 1, max: 9, step: 0.1, default: 5 },
  { code: "fdv", status: "supported", kind: "version", default: "0000" },
  { code: "sls", status: "supported", kind: "number", min: 1, max: 35, step: 0.1, default: 25 },
  { code: "dms", status: "unsupported", kind: "number", min: 1, max: 29.6, step: 0.1, default: 22 },
]

describe("visiblePatches", () => {
  it("hides unsupported patches and orders canonically", () => {
    expect(visiblePatches(PATCHES, "mi6").map((p) => p.code)).toEqual(["sls", "fdv", "cce", "mss", "mss0exp"])
  })

  it("only exposes MSS0 for mi6 and mi6lite", () => {
    expect(visiblePatches(PATCHES, "mi6lite").some((p) => p.code === "mss0exp")).toBe(true)
    for (const model of ["mi4", "mi5", "mi5elite", "ultra4", null]) {
      expect(visiblePatches(PATCHES, model).some((p) => p.code === "mss0exp")).toBe(false)
    }
  })

  it("drops auto-managed or unknown codes", () => {
    const withExtras = [...PATCHES, { code: "chk", status: "supported", kind: "boolean" }] as unknown as PatchCapability[]
    expect(visiblePatches(withExtras, "mi6").map((p) => p.code)).not.toContain("chk")
  })
})

describe("evaluatePatchForm", () => {
  const patches = visiblePatches(PATCHES, "mi6")

  it("starts empty with capability defaults as field text", () => {
    const state = createInitialPatchFormState(patches)
    expect(state.values.sls).toBe("25")
    expect(state.values.fdv).toBe("0000")
    expect(state.fullDump).toBe(false)
    expect(state.acknowledged).toBe(false)
    expect(evaluatePatchForm(patches, state).selection).toEqual([])
  })

  it("builds a canonical selection with typed values", () => {
    const state = createInitialPatchFormState(patches)
    state.enabled = { cce: true, sls: true, fdv: true }
    state.values.sls = "30,55"
    state.values.fdv = "1234"
    const { selection, hasExperimental } = evaluatePatchForm(patches, state)
    expect(selection).toEqual([
      { code: "sls", value: 30.6 },
      { code: "fdv", value: "1234" },
      { code: "cce", value: true },
    ])
    expect(hasExperimental).toBe(false)
  })

  it("rejects out-of-range, non-numeric and malformed version values", () => {
    const state = createInitialPatchFormState(patches)
    state.enabled = { sls: true, fdv: true, mss: true }
    state.values.sls = "36"
    state.values.fdv = "12a"
    state.values.mss = ""
    const { fieldErrors, selection } = evaluatePatchForm(patches, state)
    expect(Object.keys(fieldErrors).sort()).toEqual(["fdv", "mss", "sls"])
    expect(selection).toEqual([])
  })

  it("mss0exp supersedes mss: mss is locked and never sent", () => {
    const state = createInitialPatchFormState(patches)
    state.enabled = { mss: true, mss0exp: true }
    expect(isPatchLocked("mss", state)).toBe(true)
    const evaluation = evaluatePatchForm(patches, state)
    expect(evaluation.selection).toEqual([{ code: "mss0exp", value: true }])
    expect(evaluation.experimentalCodes).toEqual(["mss0exp"])
  })

  it("flags experimental selections", () => {
    const state = createInitialPatchFormState(patches)
    state.enabled = { mss: true }
    const evaluation = evaluatePatchForm(patches, state)
    expect(evaluation.hasExperimental).toBe(true)
    expect(evaluation.selection).toEqual([{ code: "mss", value: 5 }])
  })
})
