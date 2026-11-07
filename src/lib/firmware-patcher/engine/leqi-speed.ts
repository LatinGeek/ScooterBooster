/**
 * Port of bwpatcher/modules/leqi_speed.py (pinned 95a8f33).
 *
 * Shared Leqi speed-limit engine. `LeqiSpeedPatcher` rewrites a small speed-calculation
 * routine; `LeqiPaddingSpeedPatcher` additionally hijacks a 4-byte instruction run with a
 * `b.w` into verified zero padding (mi6 / mi6lite).
 */

import type { Signature } from "./pattern"
import { findPattern } from "./pattern"
import { CoreN32Patcher } from "./core-n32"
import { FirmwarePatchError } from "./errors"
import { bytesToHex, concatBytes, pySlice } from "./py-compat"
import { op, readU32LE, type PatchOp } from "./core"

export const MODE_PEDESTRIAN = 1
export const MODE_DRIVE = 2
export const MODE_SPORT = 3
export const MODE_ORDER = ["ped", "drive", "sport"] as const
export type SpeedMode = (typeof MODE_ORDER)[number]

const MODE_NUMBER: Readonly<Record<SpeedMode, number>> = {
  ped: MODE_PEDESTRIAN,
  drive: MODE_DRIVE,
  sport: MODE_SPORT,
}

export class LeqiSpeedPatcher extends CoreN32Patcher {
  protected patchedSpeeds: Partial<Record<SpeedMode, number>> = {}
  protected speedBlockPatched = false
  protected injectOffset: number | null = null
  protected hijackOffset: number | null = null
  protected returnAddress: number | null = null
  protected outputPtr: number | null = null
  protected regionLimitPatchOfs: number | null = null
  protected regionLimitStoreOfs: number | null = null

  /** Variant hook: regional bypass; no-op when the model has none. */
  protected speedLimitFix(): PatchOp[] {
    return []
  }

  protected resolveRegionLimitSites(
    anchor: Signature,
    stockPatch: ReadonlyArray<number>
  ): [number, number] {
    if (this.regionLimitPatchOfs !== null) {
      if (this.regionLimitStoreOfs === null) {
        throw new FirmwarePatchError("patch_failed", "region limit store offset missing")
      }
      return [this.regionLimitPatchOfs, this.regionLimitStoreOfs]
    }
    const sigOfs = findPattern(this.data, anchor)
    const patchSlot = anchor.findIndex((byte) => byte === null)
    if (patchSlot < 0) {
      throw new FirmwarePatchError(
        "patch_failed",
        "Region limit anchor has no patch-slot wildcards"
      )
    }
    const patchLen = anchor.filter((byte) => byte === null).length
    if (patchLen !== stockPatch.length) {
      throw new FirmwarePatchError(
        "patch_failed",
        `Region limit stock patch length ${stockPatch.length} does not match anchor wildcards (${patchLen})`
      )
    }
    const patchOfs = sigOfs + patchSlot
    const storeOfs = sigOfs + anchor.length - 2
    this.regionLimitPatchOfs = patchOfs
    this.regionLimitStoreOfs = storeOfs
    return [patchOfs, storeOfs]
  }

  protected applyRegionLimitMovwBranch(
    anchor: Signature,
    stockPatch: ReadonlyArray<number>,
    reg: string,
    patchName: string
  ): PatchOp[] {
    const value = 0x15e
    let sites: [number, number]
    try {
      sites = this.resolveRegionLimitSites(anchor, stockPatch)
    } catch (error) {
      if (error instanceof FirmwarePatchError && error.code === "signature_not_found") return []
      throw error
    }
    const [patchOfs, storeOfs] = sites
    const asm = `movw ${reg}, #${hexNum(value)}\nb ${hexNum(storeOfs)}`
    const post = this.assembly(asm, patchOfs)
    if (post.length !== stockPatch.length) {
      throw new FirmwarePatchError(
        "patch_failed",
        `Region limit patch @0x${patchOfs.toString(16).toUpperCase()}: expected ${stockPatch.length} bytes, got ${post.length}`
      )
    }
    const pre = pySlice(this.data, patchOfs, patchOfs + post.length)
    if (bytesEq(pre, post)) return []
    const stock = Uint8Array.from(stockPatch)
    if (!bytesEq(pre, stock)) {
      throw new FirmwarePatchError(
        "unexpected_bytes",
        `Region limit patch @0x${patchOfs.toString(16).toUpperCase()}: expected ${bytesToHex(stock)}, found ${bytesToHex(pre)}`
      )
    }
    this.data.set(post, patchOfs)
    return [op(patchName, patchOfs, bytesToHex(pre), bytesToHex(post))]
  }

  protected locatePatchOffsets(): void {
    throw new FirmwarePatchError("patch_failed", "locatePatchOffsets is not implemented")
  }

  protected applyHijackPatch(): PatchOp {
    throw new FirmwarePatchError("patch_failed", "applyHijackPatch is not implemented")
  }

  protected buildSpeedLogicAsm(): string {
    throw new FirmwarePatchError("patch_failed", "buildSpeedLogicAsm is not implemented")
  }

  protected assembleInjectBlock(asmCode: string): Uint8Array {
    if (this.injectOffset === null)
      throw new FirmwarePatchError("patch_failed", "inject offset missing")
    return this.assembly(asmCode, this.injectOffset)
  }

  protected verifyInjectSite(patchBytes: Uint8Array): void {
    // no-op for dead-code variants
    void patchBytes
  }

  protected buildModeCheckAsm(
    modeReg: string,
    speedReg: string,
    patchedBranchTarget: string
  ): string {
    const modes = MODE_ORDER.filter((mode) => this.patchedSpeeds[mode] !== undefined)
    let asm = ""
    modes.forEach((mode, index) => {
      const next = index + 1 < modes.length ? `check_${modes[index + 1]}` : "default_case"
      asm += `check_${mode}:\ncmp ${modeReg}, #${MODE_NUMBER[mode]}\nbne ${next}\nmovw ${speedReg}, #${this.patchedSpeeds[mode]}\nb ${patchedBranchTarget}\n`
    })
    return asm
  }

  protected patchSpeedBlock(pedKmh?: number, driveKmh?: number, sportKmh?: number): PatchOp[] {
    if (pedKmh !== undefined) this.patchedSpeeds.ped = this.calcSpeed(pedKmh, 10, 0) as number
    if (driveKmh !== undefined) this.patchedSpeeds.drive = this.calcSpeed(driveKmh, 10, 0) as number
    if (sportKmh !== undefined) this.patchedSpeeds.sport = this.calcSpeed(sportKmh, 10, 0) as number

    const results: PatchOp[] = []
    results.push(...this.speedLimitFix())

    if (!this.speedBlockPatched) {
      this.locatePatchOffsets()
      results.push(this.applyHijackPatch())
    }

    const asmCode = this.buildSpeedLogicAsm()
    if (this.injectOffset === null)
      throw new FirmwarePatchError("patch_failed", "inject offset missing")
    const patchBytes = this.assembleInjectBlock(asmCode)

    if (!this.speedBlockPatched) this.verifyInjectSite(patchBytes)

    const pre = pySlice(this.data, this.injectOffset, this.injectOffset + patchBytes.length)
    this.data.set(patchBytes, this.injectOffset)

    const patchName = this.speedBlockPatched ? "speed_constants_updated" : "speed_logic_block"
    results.push(op(patchName, this.injectOffset, bytesToHex(pre), bytesToHex(patchBytes)))
    this.speedBlockPatched = true
    return results
  }

  override speedLimitPed(kmh: number): PatchOp[] {
    return this.patchSpeedBlock(kmh, undefined, undefined)
  }

  override speedLimitDrive(kmh: number): PatchOp[] {
    return this.patchSpeedBlock(undefined, kmh, undefined)
  }

  override speedLimitSport(kmh: number): PatchOp[] {
    return this.patchSpeedBlock(undefined, undefined, kmh)
  }

  protected verifyHijackBytes(offset: number, expected: ReadonlyArray<number>): void {
    const actual = pySlice(this.data, offset, offset + expected.length)
    if (!bytesEq(actual, Uint8Array.from(expected))) {
      throw new FirmwarePatchError(
        "unexpected_bytes",
        `Hijack site @0x${offset.toString(16).toUpperCase()}: expected ${bytesToHex(
          Uint8Array.from(expected)
        )}, found ${bytesToHex(actual)}`
      )
    }
  }

  protected verifyZeroPadding(offset: number, size: number): void {
    const region = pySlice(this.data, offset, offset + size)
    if (region.length !== size || region.some((b) => b !== 0)) {
      throw new FirmwarePatchError(
        "unexpected_bytes",
        `Inject site @0x${offset.toString(16).toUpperCase()} is not zero padding (${size} bytes required)`
      )
    }
  }

  protected readLdrPcLiteral(insnOffset: number): number {
    const insn = pySlice(this.data, insnOffset, insnOffset + 2)
    if (insn.length !== 2) {
      throw new FirmwarePatchError(
        "patch_failed",
        `ldr @0x${insnOffset.toString(16).toUpperCase()}: truncated instruction`
      )
    }
    const hw = (insn[0] ?? 0) | ((insn[1] ?? 0) << 8)
    const imm = (hw & 0xff) * 4
    const pc = (insnOffset + 4) & ~3
    const literalAddr = pc + imm
    if (literalAddr + 4 > this.data.length) {
      throw new FirmwarePatchError(
        "patch_failed",
        `ldr @0x${insnOffset.toString(16).toUpperCase()}: literal pool @0x${literalAddr.toString(16).toUpperCase()} out of range`
      )
    }
    return readU32LE(this.data, literalAddr)
  }

  protected findTailZeroPadding(
    minSize: number,
    searchFrom?: number | null,
    searchWindow?: number | null,
    padMarker?: Signature | null
  ): number {
    let from = searchFrom ?? null
    if (from === null) {
      const window = searchWindow ?? 0x800
      from = Math.max(0, this.data.length - window)
    }
    const searchEnd = Math.max(from, this.data.length - 2)
    if (searchEnd - from < minSize) {
      throw new FirmwarePatchError(
        "patch_failed",
        `No room for ${minSize}-byte zero padding after 0x${from.toString(16).toUpperCase()} (end=0x${searchEnd.toString(16).toUpperCase()})`
      )
    }

    let padOfs: number | null = null
    if (padMarker) {
      try {
        const markerOfs = findPattern(this.data, padMarker, null, from)
        padOfs = markerOfs + padMarker.length
      } catch (error) {
        if (!(error instanceof FirmwarePatchError) || error.code !== "signature_not_found")
          throw error
      }
    }
    if (padOfs === null) {
      const zeroSig = new Array<number | null>(minSize).fill(0)
      try {
        padOfs = findPattern(this.data, zeroSig, null, from)
      } catch (error) {
        if (!(error instanceof FirmwarePatchError) || error.code !== "signature_not_found")
          throw error
        throw new FirmwarePatchError(
          "signature_not_found",
          `No zero padding signature (${minSize} x 00) found after 0x${from.toString(16).toUpperCase()}`
        )
      }
    }

    if (padOfs + minSize > searchEnd) {
      throw new FirmwarePatchError(
        "patch_failed",
        `Zero padding @0x${padOfs.toString(16).toUpperCase()} overlaps CRC / end of firmware`
      )
    }

    let runEnd = padOfs
    while (runEnd < searchEnd && this.data[runEnd] === 0) runEnd++
    if (runEnd - padOfs < minSize) {
      throw new FirmwarePatchError(
        "patch_failed",
        `Zero padding @0x${padOfs.toString(16).toUpperCase()} only ${runEnd - padOfs} bytes (need ${minSize})`
      )
    }
    return padOfs
  }

  protected resolveSpeedPaddingSites(
    anchor: Signature,
    hijackSize: number,
    outputPtrLdrOffset: number,
    minPaddingSize: number,
    injectSearchFrom?: number | null,
    padMarker?: Signature | null
  ): void {
    if (this.hijackOffset !== null) return

    const sigOfs = findPattern(this.data, anchor)
    if (hijackSize > anchor.length) {
      throw new FirmwarePatchError(
        "patch_failed",
        `Speed calc hijack size ${hijackSize} exceeds anchor length ${anchor.length}`
      )
    }
    if (outputPtrLdrOffset + 2 > anchor.length) {
      throw new FirmwarePatchError(
        "patch_failed",
        "output_ptr_ldr_offset must fall within speed calc anchor"
      )
    }

    this.hijackOffset = sigOfs
    this.returnAddress = sigOfs + anchor.length
    this.outputPtr = this.readLdrPcLiteral(sigOfs + outputPtrLdrOffset)
    this.injectOffset = this.findTailZeroPadding(
      minPaddingSize,
      injectSearchFrom,
      undefined,
      padMarker
    )
  }

  protected applyBwHijack(
    hijackOffset: number,
    injectOffset: number,
    sigHijack: ReadonlyArray<number | null>,
    patchName = "hijack_speed_calc"
  ): PatchOp {
    this.verifyHijackBytes(
      hijackOffset,
      sigHijack.filter((b): b is number => b !== null)
    )
    const branchBytes = this.assembly(`b.w ${hexNum(injectOffset)}`, hijackOffset)
    if (branchBytes.length !== 4) {
      throw new FirmwarePatchError(
        "encoding_failed",
        `Hijack branch must be 4 bytes, got ${branchBytes.length}`
      )
    }
    const pre = pySlice(this.data, hijackOffset, hijackOffset + 4)
    this.data.set(branchBytes, hijackOffset)
    return op(patchName, hijackOffset, bytesToHex(pre), bytesToHex(branchBytes))
  }

  protected buildPaddingSpeedLogicAsm(
    reloadAsm: string,
    modeReg: string,
    speedReg: string,
    ptrReg: string,
    returnAddress: number,
    outputPtr: number
  ): string {
    void outputPtr
    let asm = reloadAsm + "\n"
    asm += `and ${modeReg}, ${modeReg}, #3\n`
    asm += this.buildModeCheckAsm(modeReg, speedReg, "store")
    asm += `default_case:\nadd.w ${speedReg}, ${speedReg}, ${speedReg}, lsl #2\nlsls ${speedReg}, ${speedReg}, #1\nstore:\nldr ${ptrReg}, [pc, #4]\nstrh ${speedReg}, [${ptrReg}]\nb.w ${hexNum(returnAddress)}\n`
    return asm
  }

  protected assembleWithLiteralPool(
    asmCode: string,
    injectOffset: number,
    literalValue: number
  ): Uint8Array {
    const codeBytes = this.assembly(asmCode, injectOffset).slice()
    if (codeBytes.length < 8) {
      throw new FirmwarePatchError(
        "patch_failed",
        "Inject block too short for ldr/strh/b.w epilogue"
      )
    }
    const ldrAt = injectOffset + codeBytes.length - 8
    const pc = (ldrAt + 4) & ~3
    const codeEnd = injectOffset + codeBytes.length
    const litAddr = (codeEnd + 3) & ~3
    const imm = litAddr - pc
    if (imm < 0 || imm > 1020 || imm % 4 !== 0) {
      throw new FirmwarePatchError(
        "patch_failed",
        `Cannot place literal pool: ldr@0x${ldrAt.toString(16).toUpperCase()} pc=0x${pc.toString(16).toUpperCase()} lit=0x${litAddr.toString(16).toUpperCase()} imm=${imm}`
      )
    }

    const base = codeBytes.length - 8
    const rt = (codeBytes[base + 1] ?? 0) & 0x07
    if (((codeBytes[base + 1] ?? 0) & 0xf8) !== 0x48) {
      throw new FirmwarePatchError(
        "encoding_failed",
        `Expected Thumb ldr [pc] before strh/b.w, found ${bytesToHex(codeBytes.subarray(base, base + 2))}`
      )
    }
    codeBytes[base] = imm / 4
    codeBytes[base + 1] = 0x48 | rt
    const pad = litAddr - codeEnd
    return concatBytes(codeBytes, new Uint8Array(pad), u32le(literalValue))
  }
}

/** Leqi speed patcher using verified-zero padding for injected code (mi6, mi6lite). */
export class LeqiPaddingSpeedPatcher extends LeqiSpeedPatcher {
  SIG_SPEED_CALC_ANCHOR: Signature = []
  HIJACK_SIZE = 4
  OUTPUT_PTR_LDR_OFFSET = 0
  PADDING_SAFETY_MARGIN = 16
  INJECT_SEARCH_START = 0xa000
  SIG_INJECT_PAD_MARKER: Signature = [0x21, 0x3b, 0xb0, 0x17, 0xfd, 0x63, 0x69, 0x34]

  protected override locatePatchOffsets(): void {
    try {
      this.resolveSpeedPaddingSites(
        this.SIG_SPEED_CALC_ANCHOR,
        this.HIJACK_SIZE,
        this.OUTPUT_PTR_LDR_OFFSET,
        this.PADDING_SAFETY_MARGIN,
        this.INJECT_SEARCH_START,
        this.SIG_INJECT_PAD_MARKER
      )
    } catch (error) {
      if (error instanceof FirmwarePatchError && error.code === "signature_not_found") {
        throw new FirmwarePatchError(
          "signature_not_found",
          "Could not find speed calc signature for patching"
        )
      }
      throw error
    }
    if (this.injectOffset === null)
      throw new FirmwarePatchError("patch_failed", "inject offset missing")
    this.injectOffset += this.PADDING_SAFETY_MARGIN
  }

  protected override applyHijackPatch(): PatchOp {
    if (this.hijackOffset === null || this.injectOffset === null) {
      throw new FirmwarePatchError("patch_failed", "hijack/inject offset missing")
    }
    return this.applyBwHijack(
      this.hijackOffset,
      this.injectOffset,
      this.SIG_SPEED_CALC_ANCHOR.slice(0, this.HIJACK_SIZE)
    )
  }

  protected requiredPaddingSize(patchBytes: Uint8Array): number {
    return patchBytes.length + this.PADDING_SAFETY_MARGIN
  }

  protected override verifyInjectSite(patchBytes: Uint8Array): void {
    if (this.injectOffset === null)
      throw new FirmwarePatchError("patch_failed", "inject offset missing")
    const need = this.requiredPaddingSize(patchBytes)
    const zeroSig = new Array<number | null>(need).fill(0)
    let found: number
    try {
      found = findPattern(this.data, zeroSig, null, this.injectOffset)
    } catch (error) {
      if (!(error instanceof FirmwarePatchError) || error.code !== "signature_not_found")
        throw error
      throw new FirmwarePatchError(
        "unexpected_bytes",
        `Inject site @0x${this.injectOffset.toString(16).toUpperCase()} lacks ${need}-byte zero padding (patch=${patchBytes.length} + margin=${this.PADDING_SAFETY_MARGIN})`
      )
    }
    if (found !== this.injectOffset) {
      throw new FirmwarePatchError(
        "unexpected_bytes",
        `Inject site @0x${this.injectOffset.toString(16).toUpperCase()} is not zero padding (${need} bytes required; next zero run @0x${found.toString(16).toUpperCase()})`
      )
    }
  }

  protected override assembleInjectBlock(asmCode: string): Uint8Array {
    if (this.injectOffset === null || this.outputPtr === null) {
      throw new FirmwarePatchError("patch_failed", "inject/output offset missing")
    }
    return this.assembleWithLiteralPool(asmCode, this.injectOffset, this.outputPtr)
  }
}

function hexNum(value: number): string {
  return `0x${value.toString(16)}`
}

function bytesEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function u32le(value: number): Uint8Array {
  return Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff
  )
}
