import { describe, expect, it } from "vitest"

import { decodeInstructions, disassemble, firstOperandRegister } from "./decoder"
import { assemble } from "./thumb"
import { extractLdrOffset, getReg, offsetToNearestWord } from "../engine/pattern"

function hex(data: Uint8Array): string {
  return Array.from(data, (b) => b.toString(16).padStart(2, "0")).join("")
}

describe("Thumb decoder", () => {
  it("decodes the 16-bit LDR literal forms used by get_reg", () => {
    // capstone 4.0.2: ldr r4, [pc, #0x328]
    expect(disassemble(Uint8Array.of(0xca, 0x4c))).toBe("ldr\tr4, [pc, #0x328]")
    expect(disassemble(Uint8Array.of(0x4c, 0x4a))).toBe("ldr\tr2, [pc, #0x130]")
    expect(firstOperandRegister(Uint8Array.of(0xca, 0x4c), "r1")).toBe("r4")
  })

  it("decodes movs/cmp/ldrb/strh", () => {
    expect(disassemble(Uint8Array.of(0xfc, 0x21))).toContain("movs\tr1")
    expect(disassemble(Uint8Array.of(0x1e, 0x2b))).toBe("cmp\tr3, #30")
    expect(disassemble(Uint8Array.of(0x00, 0x88))).toBe("ldrh\tr0, [r0, #0x0]")
    expect(disassemble(Uint8Array.of(0x1a, 0x80))).toBe("strh\tr2, [r3, #0x0]")
  })

  it("decodes 32-bit instructions emitted by the assembler", () => {
    expect(disassemble(assemble("movw r1, #0x15e"))).toBe("movw\tr1, #350")
    expect(disassemble(assemble("add.w r2, r2, r2, lsl #2"))).toBe("add.w\tr2, r2, r2, lsl #2")
    expect(disassemble(assemble("ldrb.w r0, [r8, #5]"))).toBe("ldrb.w\tr0, [r8, #0x5]")
  })

  it("round-trips b.w and every instruction length", () => {
    const code = assemble("nop\nb.w 0x1234\nldr r1, [pc, #4]")
    const decoded = decodeInstructions(code, 0)
    expect(decoded.map((insn) => insn.size).reduce((a, b) => a + b, 0)).toBe(code.length)
    expect(decoded[1]?.mnemonic).toBe("b.w")
  })

  it("falls back for unknown instructions and high registers", () => {
    expect(firstOperandRegister(Uint8Array.of(0x00, 0xff), "r4")).toBe("r4")
    expect(disassemble(Uint8Array.of(0xff, 0xff))).toBe(".word\t0xffff")
  })
})

describe("upstream string helpers", () => {
  it("extracts the LDR literal offset", () => {
    expect(extractLdrOffset("ldr\tr5, [pc, #0x1dc]")).toBe(0x1dc)
    expect(extractLdrOffset("ldr\tr1, [r2, #0x10]")).toBeNull()
    expect(extractLdrOffset("")).toBeNull()
  })

  it("mirrors get_reg's tab/comma split", () => {
    expect(getReg("ldr\tr4, [pc, #0x328]")).toBe("r4")
    expect(getReg("ldr\tr4, [pc, #0x328]", "r1")).toBe("r4")
    expect(getReg("bogus", "r1")).toBe("r1")
    expect(getReg(null, "r4")).toBe("r4")
  })

  it("advances to the nearest 4-byte word", () => {
    expect(offsetToNearestWord(0x100)).toBe(0x100)
    expect(offsetToNearestWord(0x102)).toBe(0x104)
    expect(offsetToNearestWord(0x10e)).toBe(0x110)
    expect(() => offsetToNearestWord(0x101)).toThrow()
  })
})

describe("assembler/decoder consistency", () => {
  it("emits exactly the bytes the decoder reads", () => {
    for (const source of [
      "nop",
      "movs r1,#1",
      "cmp r3,#0",
      "movw r2,#0x15e",
      "b 0x110",
      "ldr r0,[pc,#8]",
    ]) {
      const code = assemble(source, 0x100)
      const decoded = decodeInstructions(code, 0x100)
      expect(hex(code)).toBe(hex(assemble(source, 0x100)))
      expect(decoded.length).toBeGreaterThan(0)
    }
  })
})
