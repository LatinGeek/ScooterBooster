import { describe, expect, it } from "vitest"
import { AssemblerError, UnsupportedEncodingError } from "../engine/errors"
import { assemble } from "./thumb"
import goldens from "./__fixtures__/keystone-goldens.json"

interface Vector {
  f: string
  a: string
  d: number
  r: string
  m: boolean
  c?: [string, number]
}

const vectors = goldens.vectors as Vector[]

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

function programOf(v: Vector): string {
  if (!v.c) return v.a
  const [mn, n] = v.c
  return v.f === "label-fwd"
    ? `${mn} L\n` + "nop\n".repeat(n) + "L:\nnop\n"
    : "L:\n" + "nop\n".repeat(n) + `${mn} L\n`
}

describe("thumb assembler vs keystone goldens", () => {
  it("has a non-trivial golden set", () => {
    expect(vectors.length).toBeGreaterThan(3000)
  })

  it("matches keystone byte-for-byte on every supported form", () => {
    const mismatches: string[] = []
    const unsupportedByFamily = new Map<string, number>()
    let matched = 0
    for (const v of vectors) {
      const program = programOf(v)
      const label = `[${v.f}] @${v.d} ${JSON.stringify(program.slice(0, 100))}`
      let got: string
      try {
        got = hex(assemble(program, v.d))
      } catch (error) {
        if (error instanceof UnsupportedEncodingError) {
          if (v.m) mismatches.push(`MUST support ${label} -> ${v.r}`)
          unsupportedByFamily.set(v.f, (unsupportedByFamily.get(v.f) ?? 0) + 1)
          continue
        }
        if (error instanceof AssemblerError) {
          if (v.r !== "ERR" && v.r !== "NONE") {
            mismatches.push(`unexpected error ${label} -> ${v.r} (${error.message})`)
          }
          continue
        }
        throw error
      }
      if (v.r === "ERR" || v.r === "NONE") {
        mismatches.push(`expected ${v.r} ${label} got ${got}`)
      } else if (got !== v.r) {
        mismatches.push(`${label}\n   want ${v.r.slice(0, 80)}\n   got  ${got.slice(0, 80)}`)
      } else {
        matched++
      }
    }
    if (mismatches.length > 0) {
      console.log(`mismatches: ${mismatches.length}, matched: ${matched}`)
      console.log(mismatches.slice(0, 30).join("\n"))
      console.log("unsupported by family:", Object.fromEntries(unsupportedByFamily))
    }
    expect(mismatches).toEqual([])
    expect(matched).toBeGreaterThan(2500)
  })

  it("rejects labels that are undefined or duplicated", () => {
    expect(() => assemble("b nowhere")).toThrow(AssemblerError)
    expect(() => assemble("a:\nnop\na:\nnop")).toThrow(AssemblerError)
  })
})
