/**
 * Minimal first-party Thumb/Thumb-2 assembler.
 *
 * Replaces `keystone.Ks(KS_ARCH_ARM, KS_MODE_THUMB).asm(code, addr)` for exactly the instruction
 * forms bw-patcher v1.1.6 emits (no GPL/native dependency, SPEC 4.5). Output is verified against
 * keystone 0.9.2 by golden vectors (`assembler/__fixtures__/keystone-goldens.json`) generated
 * with `scripts/firmware-parity/gen_golden_assembler.py`.
 *
 * Contract:
 *  - Every encoding that keystone would produce for a supported form is produced byte-for-byte.
 *  - Forms keystone would encode differently/wider than this encoder implements throw
 *    `UnsupportedEncodingError`. Every upstream call site asserts a narrow size or only uses
 *    in-range operands, so those cases are failures upstream as well (see PROVENANCE.md).
 *  - Invalid input throws `AssemblerError` (keystone raises KsError).
 */

import { AssemblerError, UnsupportedEncodingError } from "../engine/errors"

// ---------------------------------------------------------------------------
// Operand parsing
// ---------------------------------------------------------------------------

const REG_ALIASES: Readonly<Record<string, number>> = {
  sb: 9,
  sl: 10,
  fp: 11,
  ip: 12,
  sp: 13,
  lr: 14,
  pc: 15,
}

function parseReg(token: string): number | null {
  const t = token.trim().toLowerCase()
  const alias = REG_ALIASES[t]
  if (alias !== undefined) return alias
  const m = /^r(\d{1,2})$/.exec(t)
  if (!m) return null
  const n = Number(m[1])
  return n >= 0 && n <= 15 ? n : null
}

function parseImm(token: string): number | null {
  const m = /^#?\s*(-?)\s*(0x[0-9a-f]+|\d+)$/i.exec(token.trim())
  if (!m) return null
  const magnitude = m[2]?.toLowerCase().startsWith("0x")
    ? parseInt(m[2], 16)
    : parseInt(m[2] ?? "", 10)
  if (!Number.isFinite(magnitude)) return null
  return m[1] === "-" ? -magnitude : magnitude
}

/** Split on commas that are not inside [...] or {...}. */
function splitOperands(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ""
  for (const ch of text) {
    if (ch === "[" || ch === "{") depth++
    if (ch === "]" || ch === "}") depth--
    if (ch === "," && depth === 0) {
      out.push(cur.trim())
      cur = ""
    } else {
      cur += ch
    }
  }
  if (cur.trim() !== "" || out.length > 0) out.push(cur.trim())
  return out
}

interface MemOperand {
  base: number
  offset: number
  /** True for `[rn]` / `[rn, #imm]`, false for anything else (register offsets, writeback...). */
  ok: boolean
}

function parseMem(token: string): MemOperand | null {
  const m = /^\[\s*([^,\]]+?)\s*(?:,\s*([^\]]+?)\s*)?\]$/.exec(token.trim())
  if (!m) return null
  const base = parseReg(m[1] ?? "")
  if (base === null) return null
  if (m[2] === undefined) return { base, offset: 0, ok: true }
  const off = parseImm(m[2])
  if (off === null) return { base, offset: 0, ok: false }
  return { base, offset: off, ok: true }
}

const COND_CODES: Readonly<Record<string, number>> = {
  eq: 0,
  ne: 1,
  cs: 2,
  hs: 2,
  cc: 3,
  lo: 3,
  mi: 4,
  pl: 5,
  vs: 6,
  vc: 7,
  hi: 8,
  ls: 9,
  ge: 10,
  lt: 11,
  gt: 12,
  le: 13,
}

// ---------------------------------------------------------------------------
// Parsed program
// ---------------------------------------------------------------------------

type Item =
  | { kind: "insn"; text: string; mnemonic: string; operands: string[]; size: number; at: number }
  | { kind: "label"; name: string }

function parseProgram(code: string): Item[] {
  const items: Item[] = []
  for (const rawLine of code.split(/\r?\n|;/)) {
    let line = rawLine.trim()
    if (line === "") continue
    for (;;) {
      const lm = /^([A-Za-z_.$][\w.$]*):\s*(.*)$/.exec(line)
      if (!lm) break
      items.push({ kind: "label", name: lm[1] ?? "" })
      line = (lm[2] ?? "").trim()
    }
    if (line === "") continue
    const sp = line.search(/\s/)
    const mnemonic = (sp === -1 ? line : line.slice(0, sp)).toLowerCase()
    const rest = sp === -1 ? "" : line.slice(sp + 1).trim()
    items.push({
      kind: "insn",
      text: line,
      mnemonic,
      operands: rest === "" ? [] : splitOperands(rest),
      size: 2,
      at: 0,
    })
  }
  return items
}

// ---------------------------------------------------------------------------
// Encoders
// ---------------------------------------------------------------------------

type Halfwords = number[]

function bad(item: { text: string }, why = "invalid operand"): never {
  throw new AssemblerError(`Invalid operand (${why})`, item.text)
}

function unsupported(item: { text: string }, why: string): never {
  throw new UnsupportedEncodingError(`Unsupported encoding (${why})`, item.text)
}

function isLo(r: number): boolean {
  return r >= 0 && r <= 7
}

function encodeBranchWide(offset: number): Halfwords {
  // B.W (T4): offset is PC-relative (target - (addr + 4)), even, 25-bit signed.
  if (offset % 2 !== 0 || offset < -(2 ** 24) || offset > 2 ** 24 - 2) {
    throw new AssemblerError("Invalid operand (branch out of range)")
  }
  const u = offset < 0 ? offset + 2 ** 25 : offset
  const s = (u >>> 24) & 1
  const i1 = (u >>> 23) & 1
  const i2 = (u >>> 22) & 1
  const imm10 = (u >>> 12) & 0x3ff
  const imm11 = (u >>> 1) & 0x7ff
  const j1 = ~(i1 ^ s) & 1
  const j2 = ~(i2 ^ s) & 1
  return [0xf000 | (s << 10) | imm10, 0x9000 | (j1 << 13) | (j2 << 11) | imm11]
}

function resolveCond(mnemonic: string): number | null {
  if (mnemonic.length !== 3 || mnemonic[0] !== "b") return null
  return COND_CODES[mnemonic.slice(1)] ?? null
}

function isBranchMnemonic(m: string): boolean {
  return m === "b" || m === "b.w" || m === "b.n" || resolveCond(m) !== null
}

/** Encodes one non-branch instruction. */
function encodeSimple(item: Extract<Item, { kind: "insn" }>): Halfwords {
  const { mnemonic: mn, operands: ops } = item

  switch (mn) {
    case "nop": {
      if (ops.length !== 0) bad(item)
      return [0xbf00]
    }

    case "movs":
    case "mov": {
      if (ops.length !== 2) bad(item)
      const rd = parseReg(ops[0] ?? "")
      if (rd === null) bad(item)
      const rmReg = parseReg(ops[1] ?? "")
      if (rmReg !== null) {
        if (mn === "movs") {
          if (!isLo(rd) || !isLo(rmReg)) unsupported(item, "movs hi register")
          return [(rmReg << 3) | rd]
        }
        return [0x4600 | ((rd >> 3) << 7) | (rmReg << 3) | (rd & 7)]
      }
      const imm = parseImm(ops[1] ?? "")
      if (imm === null) bad(item)
      if (imm < 0) unsupported(item, "negative immediate (keystone emits mvns/wide form)")
      if (mn === "movs" && isLo(rd) && imm <= 255) return [0x2000 | (rd << 8) | imm]
      return unsupported(item, "mov immediate wider than 8 bits / non-low register")
    }

    case "movw": {
      if (ops.length !== 2) bad(item)
      const rd = parseReg(ops[0] ?? "")
      const imm = parseImm(ops[1] ?? "")
      if (rd === null || imm === null || imm < 0 || imm > 0xffff || rd === 13 || rd === 15)
        bad(item)
      const imm4 = (imm >> 12) & 0xf
      const i = (imm >> 11) & 1
      const imm3 = (imm >> 8) & 7
      const imm8 = imm & 0xff
      return [0xf240 | (i << 10) | imm4, (imm3 << 12) | (rd << 8) | imm8]
    }

    case "cmp": {
      if (ops.length !== 2) bad(item)
      const rn = parseReg(ops[0] ?? "")
      if (rn === null) bad(item)
      const rm = parseReg(ops[1] ?? "")
      if (rm !== null) {
        if (isLo(rn) && isLo(rm)) return [0x4280 | (rm << 3) | rn]
        return [0x4500 | ((rn >> 3) << 7) | (rm << 3) | (rn & 7)]
      }
      const imm = parseImm(ops[1] ?? "")
      if (imm === null) bad(item)
      if (imm < 0) bad(item, "negative immediate")
      if (isLo(rn) && imm <= 255) return [0x2800 | (rn << 8) | imm]
      return unsupported(item, "cmp immediate wider than 8 bits / non-low register")
    }

    case "lsls": {
      let rd: number | null
      let rm: number | null
      let immTok: string | undefined
      if (ops.length === 3) {
        rd = parseReg(ops[0] ?? "")
        rm = parseReg(ops[1] ?? "")
        immTok = ops[2]
      } else if (ops.length === 2) {
        rd = parseReg(ops[0] ?? "")
        rm = rd
        immTok = ops[1]
      } else {
        return bad(item)
      }
      const imm = parseImm(immTok ?? "")
      if (rd === null || rm === null || imm === null) bad(item)
      if (!isLo(rd) || !isLo(rm)) unsupported(item, "lsls hi register")
      if (imm < 1 || imm > 31) bad(item, "shift out of range")
      return [(imm << 6) | (rm << 3) | rd]
    }

    case "ldr": {
      if (ops.length !== 2) bad(item)
      const rt = parseReg(ops[0] ?? "")
      if (rt === null) bad(item)
      const target = (ops[1] ?? "").trim()
      if (target.startsWith("=")) {
        const val = parseImm(target.slice(1))
        if (val === null || val < 0 || val > 0xffffffff) bad(item)
        if (!isLo(rt)) unsupported(item, "ldr = into high register")
        // Placeholder imm8, patched once the pool position is known.
        return [0x4800 | (rt << 8)]
      }
      const mem = parseMem(target)
      if (!mem || !mem.ok || mem.base !== 15) {
        return unsupported(item, "ldr form other than [pc, #imm]")
      }
      const imm = mem.offset
      if (isLo(rt) && imm >= 0 && imm <= 1020 && imm % 4 === 0)
        return [0x4800 | (rt << 8) | (imm >> 2)]
      return unsupported(item, "ldr [pc, #imm] not encodable as narrow T1")
    }

    case "ldrb": {
      if (ops.length !== 2) bad(item)
      const rt = parseReg(ops[0] ?? "")
      const mem = parseMem(ops[1] ?? "")
      if (rt === null || !mem || !mem.ok) bad(item)
      if (isLo(rt) && isLo(mem.base) && mem.offset >= 0 && mem.offset <= 31) {
        return [0x7800 | (mem.offset << 6) | (mem.base << 3) | rt]
      }
      return unsupported(item, "ldrb outside narrow T1 range")
    }

    case "ldrb.w": {
      if (ops.length !== 2) bad(item)
      const rt = parseReg(ops[0] ?? "")
      const mem = parseMem(ops[1] ?? "")
      if (rt === null || !mem || !mem.ok || mem.offset < 0 || mem.offset > 4095) bad(item)
      if (rt === 13 || rt === 15 || mem.base === 15) unsupported(item, "ldrb.w special register")
      return [0xf890 | mem.base, (rt << 12) | mem.offset]
    }

    case "strh": {
      if (ops.length !== 2) bad(item)
      const rt = parseReg(ops[0] ?? "")
      const mem = parseMem(ops[1] ?? "")
      if (rt === null || !mem || !mem.ok) bad(item)
      if (
        isLo(rt) &&
        isLo(mem.base) &&
        mem.offset >= 0 &&
        mem.offset <= 62 &&
        mem.offset % 2 === 0
      ) {
        return [0x8000 | ((mem.offset >> 1) << 6) | (mem.base << 3) | rt]
      }
      return unsupported(item, "strh outside narrow T1 range")
    }

    case "and": {
      if (ops.length !== 3) bad(item)
      const rd = parseReg(ops[0] ?? "")
      const rn = parseReg(ops[1] ?? "")
      const imm = parseImm(ops[2] ?? "")
      if (rd === null || rn === null || imm === null) bad(item)
      if (imm < 0 || imm > 255 || rd === 13 || rd === 15 || rn === 13 || rn === 15) {
        return unsupported(item, "and immediate outside plain 8-bit modified immediate")
      }
      return [0xf000 | rn, (rd << 8) | imm]
    }

    case "add.w": {
      if (ops.length !== 4) bad(item)
      const rd = parseReg(ops[0] ?? "")
      const rn = parseReg(ops[1] ?? "")
      const rm = parseReg(ops[2] ?? "")
      const sh = /^lsl\s+#?(\d+)$/i.exec((ops[3] ?? "").trim())
      if (rd === null || rn === null || rm === null || !sh) bad(item)
      const amount = Number(sh[1])
      if (amount < 0 || amount > 31) bad(item, "shift out of range")
      if (rd === 13 || rd === 15 || rn === 15 || rm === 13 || rm === 15)
        unsupported(item, "add.w special reg")
      return [0xeb00 | rn, ((amount >> 2) << 12) | (rd << 8) | ((amount & 3) << 6) | rm]
    }

    default:
      return unsupported(item, `mnemonic ${mn}`)
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

interface BranchResolution {
  size: 2 | 4
  halfwords: Halfwords
}

function branchTarget(
  item: Extract<Item, { kind: "insn" }>,
  labels: Map<string, number>
): {
  target: number
  numeric: boolean
} {
  const operand = item.operands[0]
  if (item.operands.length !== 1 || operand === undefined) bad(item)
  const imm = parseImm(operand)
  if (imm !== null) return { target: imm, numeric: true }
  if (!/^[A-Za-z_.$][\w.$]*$/.test(operand)) bad(item)
  const addr = labels.get(operand)
  if (addr === undefined) bad(item, "undefined label")
  return { target: addr, numeric: false }
}

function resolveBranch(
  item: Extract<Item, { kind: "insn" }>,
  labels: Map<string, number>,
  forceWide: boolean
): BranchResolution {
  const { target, numeric } = branchTarget(item, labels)
  if (target % 2 !== 0) bad(item, "odd branch target")
  const rel = target - item.at
  const offset = target - (item.at + 4)
  const mn = item.mnemonic
  const cond = resolveCond(mn)

  if (mn === "b.w") return { size: 4, halfwords: encodeBranchWide(offset) }

  if (cond !== null) {
    // Conditional: narrow T1 only (keystone's wide form with absolute targets is not replicated).
    if (!numeric) {
      if (offset < -256 || offset > 254) {
        unsupported(item, "conditional branch outside narrow range")
      }
    } else if (rel < -252 || rel > 254) {
      unsupported(item, "numeric conditional branch outside narrow range")
    }
    return { size: 2, halfwords: [0xd000 | (cond << 8) | ((offset >> 1) & 0xff)] }
  }

  // Unconditional `b` / `b.n`
  if (mn === "b.n") {
    if (offset < -2048 || offset > 2046) bad(item, "branch out of range")
    return { size: 2, halfwords: [0xe000 | ((offset >> 1) & 0x7ff)] }
  }
  const narrow = numeric ? rel >= -2044 && rel <= 2046 : offset >= -2048 && offset <= 2046
  if (narrow && !forceWide) return { size: 2, halfwords: [0xe000 | ((offset >> 1) & 0x7ff)] }
  return { size: 4, halfwords: encodeBranchWide(offset) }
}

/**
 * Assemble `code` (newline or `;` separated, labels as `name:`) located at address `addr`.
 * Numeric branch operands are absolute target addresses, like keystone.
 */
export function assemble(code: string, addr = 0): Uint8Array {
  const items = parseProgram(code)

  // Literal pool entries from `ldr rX, =imm`, in program order.
  const literals: number[] = []
  const literalItems: Array<Extract<Item, { kind: "insn" }>> = []

  // First pass: sizes (branches start narrow; widened iteratively).
  const wide = new Set<Item>()
  const staticHalfwords = new Map<Item, Halfwords>()
  for (const item of items) {
    if (item.kind !== "insn") continue
    if (isBranchMnemonic(item.mnemonic)) {
      item.size = item.mnemonic === "b.w" ? 4 : 2
      continue
    }
    const hws = encodeSimple(item)
    staticHalfwords.set(item, hws)
    item.size = hws.length * 2
    if (item.mnemonic === "ldr" && (item.operands[1] ?? "").trim().startsWith("=")) {
      literalItems.push(item)
      const val = parseImm((item.operands[1] ?? "").trim().slice(1))
      literals.push((val ?? 0) >>> 0)
    }
  }

  let labels = new Map<string, number>()
  let resolved = new Map<Item, BranchResolution>()
  for (let iteration = 0; iteration < 64; iteration++) {
    labels = new Map()
    let pos = addr
    for (const item of items) {
      if (item.kind === "label") {
        if (labels.has(item.name)) throw new AssemblerError("Invalid label (duplicate)", item.name)
        labels.set(item.name, pos)
      } else {
        item.at = pos
        pos += item.size
      }
    }
    resolved = new Map()
    let changed = false
    for (const item of items) {
      if (item.kind !== "insn" || !isBranchMnemonic(item.mnemonic)) continue
      const res = resolveBranch(item, labels, wide.has(item))
      resolved.set(item, res)
      if (res.size !== item.size) {
        item.size = res.size
        changed = true
      }
      if (res.size === 4 && !wide.has(item) && item.mnemonic === "b") wide.add(item)
    }
    if (!changed) break
    if (iteration === 63) throw new AssemblerError("branch relaxation did not converge")
  }

  const out: number[] = []
  const pushHalfwords = (hws: Halfwords): void => {
    for (const hw of hws) out.push(hw & 0xff, (hw >> 8) & 0xff)
  }
  let end = addr
  for (const item of items) {
    if (item.kind !== "insn") continue
    const br = resolved.get(item)
    const hws = br ? br.halfwords : staticHalfwords.get(item)
    if (!hws) throw new AssemblerError("internal: unresolved instruction", item.text)
    pushHalfwords(hws)
    end = item.at + item.size
  }

  if (literals.length > 0) {
    // keystone places the pool right after the code, 4-byte aligned in absolute address,
    // padding with a Thumb `nop` (0xBF00) when needed. Entries are not de-duplicated.
    let poolBase = end
    if (poolBase % 4 !== 0) {
      pushHalfwords([0xbf00])
      poolBase += 2
    }
    literalItems.forEach((item, index) => {
      const pc = (item.at + 4) & ~3
      const imm = poolBase + index * 4 - pc
      if (imm < 0 || imm > 1020 || imm % 4 !== 0) {
        throw new UnsupportedEncodingError("literal pool out of ldr range", item.text)
      }
      const base = (item.at - addr) as number
      const lo = out[base]
      const hi = out[base + 1]
      if (lo === undefined || hi === undefined) throw new AssemblerError("internal: pool patch")
      out[base] = imm >> 2
      out[base + 1] = hi
    })
    for (const value of literals) {
      out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff)
    }
  }

  return Uint8Array.from(out)
}
