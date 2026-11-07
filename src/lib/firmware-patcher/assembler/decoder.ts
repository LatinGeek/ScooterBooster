/**
 * Minimal first-party Thumb decoder.
 *
 * Upstream uses capstone only for three things:
 *   - `CorePatcher.disassembly()` (diagnostics),
 *   - `get_reg()` (recover the destination register of a 16-bit instruction before rewriting it),
 *   - `extract_ldr_offset()` (read the `[pc, #imm]` offset of a literal load).
 *
 * This module reproduces those needs without a native dependency. It is intentionally narrow:
 * forms it does not model are reported as `.word` and the callers fall back to their defaults,
 * exactly as `get_reg`/`extract_ldr_offset` do upstream when capstone fails.
 *
 * The output shape (`"mnemonic\top_str"` per instruction, lower-case registers, `#0x..` hex)
 * mirrors the subset of capstone formatting the upstream helpers parse.
 */

export interface DecodedInstruction {
  address: number
  mnemonic: string
  opStr: string
  size: 2 | 4
}

const COND: Readonly<Record<number, string>> = {
  0: "beq",
  1: "bne",
  2: "bcs",
  3: "bcc",
  4: "bmi",
  5: "bpl",
  6: "bvs",
  7: "bvc",
  8: "bhi",
  9: "bls",
  10: "bge",
  11: "blt",
  12: "bgt",
  13: "ble",
}

const ALU: Readonly<Record<number, string>> = {
  0: "ands",
  1: "eors",
  2: "lsls",
  3: "lsrs",
  4: "asrs",
  5: "adcs",
  6: "sbcs",
  7: "rors",
  8: "tst",
  9: "rsbs",
  10: "cmp",
  11: "cmn",
  12: "orrs",
  13: "muls",
  14: "bics",
  15: "mvns",
}

function hex(value: number): string {
  return `0x${(value >>> 0).toString(16)}`
}

function signedBranch(base: number, offset: number): string {
  const target = base + 4 + offset
  return `#${hex(target)}`
}

function decode16(hw: number, address: number): { mnemonic: string; opStr: string } {
  const rd = hw & 7
  const rn = (hw >> 3) & 7
  const rm = (hw >> 6) & 7

  // Shift (immediate), add/subtract register/immediate 3-bit
  const top5 = hw >> 11
  if (top5 === 0b00000) return { mnemonic: "lsls", opStr: `r${rd}, r${rn}, #${(hw >> 6) & 0x1f}` }
  if (top5 === 0b00001) {
    const amount = (hw >> 6) & 0x1f
    return { mnemonic: "lsrs", opStr: `r${rd}, r${rn}, #${amount === 0 ? 32 : amount}` }
  }
  if (top5 === 0b00010) {
    const amount = (hw >> 6) & 0x1f
    return { mnemonic: "asrs", opStr: `r${rd}, r${rn}, #${amount === 0 ? 32 : amount}` }
  }
  if (top5 === 0b00011) {
    const imm = (hw >> 6) & 7
    const sub = (hw & 0x200) !== 0
    return { mnemonic: sub ? "subs" : "adds", opStr: `r${rd}, r${rn}, #${imm}` }
  }
  if (top5 === 0b00100) return { mnemonic: "movs", opStr: `r${(hw >> 8) & 7}, #${hw & 0xff}` }
  if (top5 === 0b00101) return { mnemonic: "cmp", opStr: `r${(hw >> 8) & 7}, #${hw & 0xff}` }
  if (top5 === 0b00110) return { mnemonic: "adds", opStr: `r${(hw >> 8) & 7}, #${hw & 0xff}` }
  if (top5 === 0b00111) return { mnemonic: "subs", opStr: `r${(hw >> 8) & 7}, #${hw & 0xff}` }

  if (top5 === 0b01000) {
    const op = (hw >> 6) & 0xf
    const mnemonic = ALU[op] ?? "alu"
    if (op === 8 || op === 10 || op === 11) {
      return { mnemonic, opStr: `r${rd}, r${rm}` }
    }
    if (op === 9) return { mnemonic, opStr: `r${rd}, r${rm}, #0` }
    if (op === 13) return { mnemonic, opStr: `r${rd}, r${rm}, r${rd}` }
    return { mnemonic, opStr: `r${rd}, r${rm}` }
  }

  // Hi register operations / branch exchange
  if ((hw & 0xfc00) === 0x4400) {
    const op = (hw >> 8) & 3
    const rdn = (hw & 7) | ((hw >> 4) & 8)
    const rmh = (hw >> 3) & 0xf
    const mn = op === 0 ? "add" : op === 1 ? "cmp" : op === 2 ? "mov" : "bx"
    return { mnemonic: mn, opStr: op === 3 ? `r${rmh}` : `r${rdn}, r${rmh}` }
  }

  // LDR (literal)
  if ((hw & 0xf800) === 0x4800) {
    const rt = (hw >> 8) & 7
    const imm = (hw & 0xff) * 4
    return { mnemonic: "ldr", opStr: `r${rt}, [pc, #${hex(imm)}]` }
  }

  // Load/store register offset
  if ((hw & 0xf000) === 0x5000) {
    const op = (hw >> 9) & 7
    const names = ["str", "strh", "strb", "ldrsb", "ldr", "ldrh", "ldrb", "ldrsh"]
    return { mnemonic: names[op] ?? "ldr", opStr: `r${rd}, [r${rn}, r${rm}]` }
  }

  // Load/store immediate offset
  if ((hw & 0xe000) === 0x6000 && (hw & 0xf000) !== 0x8000) {
    const op = (hw >> 11) & 3
    const names = ["str", "ldr", "strb", "ldrb"]
    const scale = op === 2 || op === 3 ? 1 : 4
    const imm = ((hw >> 6) & 0x1f) * scale
    const rt = hw & 7
    return { mnemonic: names[op] ?? "ldr", opStr: `r${rt}, [r${rn}, #${hex(imm)}]` }
  }
  if ((hw & 0xf000) === 0x8000) {
    const isLoad = (hw & 0x0800) !== 0
    const imm = ((hw >> 6) & 0x1f) * 2
    const rt = hw & 7
    return { mnemonic: isLoad ? "ldrh" : "strh", opStr: `r${rt}, [r${rn}, #${hex(imm)}]` }
  }

  if ((hw & 0xf000) === 0x9000) {
    const rt = (hw >> 8) & 7
    return { mnemonic: "str", opStr: `r${rt}, [sp, #${hex((hw & 0xff) * 4)}]` }
  }
  if ((hw & 0xf000) === 0xa000) {
    const rt = (hw >> 8) & 7
    const sub = (hw & 0x0800) !== 0
    return { mnemonic: sub ? "sub" : "add", opStr: `r${rt}, sp, #${hex((hw & 0xff) * 4)}` }
  }
  if ((hw & 0xf600) === 0xb400) {
    const isPop = (hw & 0x0800) !== 0
    const list = hw & 0xff
    const regs: string[] = []
    for (let i = 0; i < 8; i++) if (list & (1 << i)) regs.push(`r${i}`)
    if (hw & 0x100) regs.push(isPop ? "pc" : "lr")
    return { mnemonic: isPop ? "pop" : "push", opStr: `{${regs.join(", ")}}` }
  }
  if ((hw & 0xf000) === 0xc000) {
    const isLoad = (hw & 0x0800) !== 0
    const base = (hw >> 8) & 7
    const list = hw & 0xff
    const regs: string[] = []
    for (let i = 0; i < 8; i++) if (list & (1 << i)) regs.push(`r${i}`)
    return {
      mnemonic: isLoad ? "ldmia" : "stmia",
      opStr: `r${base}!, {${regs.join(", ")}}`,
    }
  }
  if ((hw & 0xf000) === 0xd000) {
    const cond = (hw >> 8) & 0xf
    const off = ((hw & 0xff) << 24) >> 23
    const mn = COND[cond]
    if (mn) return { mnemonic: mn, opStr: signedBranch(address, off) }
    return { mnemonic: "svc", opStr: `#${hw & 0xff}` }
  }
  if ((hw & 0xf800) === 0xe000) {
    const off = (((hw & 0x7ff) << 21) >> 20) as number
    return { mnemonic: "b", opStr: signedBranch(address, off) }
  }
  if (hw === 0xbf00) return { mnemonic: "nop", opStr: "" }

  return { mnemonic: ".word", opStr: hex(hw) }
}

function decode32(hw1: number, hw2: number, address: number): { mnemonic: string; opStr: string } {
  // movw Rd, #imm16
  if ((hw1 & 0xfb70) === 0xf240) {
    const i = (hw1 >> 10) & 1
    const imm4 = hw1 & 0xf
    const imm3 = (hw2 >> 12) & 7
    const imm8 = hw2 & 0xff
    const rd = (hw2 >> 8) & 0xf
    const imm = (imm4 << 12) | (i << 11) | (imm3 << 8) | imm8
    return { mnemonic: "movw", opStr: `r${rd}, #${imm}` }
  }
  // add.w Rd, Rn, Rm, lsl #imm2
  if ((hw1 & 0xff00) === 0xeb00) {
    const rn = hw1 & 0xf
    const rd = (hw2 >> 8) & 0xf
    const rm = hw2 & 0xf
    const imm2 = (hw2 >> 6) & 3
    const imm3 = (hw2 >> 12) & 7
    const amount = (imm3 << 2) | imm2
    return { mnemonic: "add.w", opStr: `r${rd}, r${rn}, r${rm}, lsl #${amount}` }
  }
  // ldrb.w Rt, [Rn, #imm12]
  if ((hw1 & 0xfff0) === 0xf890) {
    const rn = hw1 & 0xf
    const rt = (hw2 >> 12) & 0xf
    return { mnemonic: "ldrb.w", opStr: `r${rt}, [r${rn}, #${hex(hw2 & 0xfff)}]` }
  }
  // b.w T4
  if ((hw1 & 0xf800) === 0xf000 && (hw2 & 0xd000) === 0x9000) {
    const s = (hw1 >> 10) & 1
    const j1 = (hw2 >> 13) & 1
    const j2 = (hw2 >> 11) & 1
    const imm10 = hw1 & 0x3ff
    const imm11 = hw2 & 0x7ff
    const i1 = ~(j1 ^ s) & 1
    const i2 = ~(j2 ^ s) & 1
    let offset = (s << 24) | (i1 << 23) | (i2 << 22) | (imm10 << 12) | (imm11 << 1)
    if (s) offset -= 1 << 25
    return { mnemonic: "b.w", opStr: signedBranch(address, offset) }
  }
  return { mnemonic: ".word", opStr: `${hex((hw1 << 16) | hw2)}` }
}

/** Decode as many whole Thumb instructions as `code` contains. */
export function decodeInstructions(code: Uint8Array, address = 0): DecodedInstruction[] {
  const out: DecodedInstruction[] = []
  let i = 0
  while (i + 2 <= code.length) {
    const hw1 = (code[i] ?? 0) | ((code[i + 1] ?? 0) << 8)
    const isWide = hw1 >= 0xe800
    if (isWide && i + 4 <= code.length) {
      const hw2 = (code[i + 2] ?? 0) | ((code[i + 3] ?? 0) << 8)
      const decoded = decode32(hw1, hw2, address + i)
      out.push({ address: address + i, ...decoded, size: 4 })
      i += 4
      continue
    }
    const decoded = decode16(hw1, address + i)
    out.push({ address: address + i, ...decoded, size: 2 })
    i += 2
  }
  return out
}

/** Capstone-shaped text: one `mnemonic\top_str` line per instruction. */
export function disassemble(code: Uint8Array, address = 0): string {
  return decodeInstructions(code, address)
    .map((insn) => `${insn.mnemonic}\t${insn.opStr}`)
    .join("\n")
}

/** First operand register of the first instruction (upstream `get_reg` equivalent). */
export function firstOperandRegister(code: Uint8Array, fallback = "r1"): string {
  const [first] = decodeInstructions(code, 0)
  if (!first || first.mnemonic === ".word") return fallback
  const reg = first.opStr.split(",")[0]?.trim()
  return reg && /^[a-z]+\d*$/.test(reg) ? reg : fallback
}
