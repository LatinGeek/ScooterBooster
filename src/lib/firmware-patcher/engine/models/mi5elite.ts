/** Port of bwpatcher/modules/mi5elite.py (pinned 95a8f33). */

import { op, type PatchOp } from "../core"
import { FirmwarePatchError, SignatureNotFoundError } from "../errors"
import { findPattern, type Signature } from "../pattern"
import { LeqiSpeedPatcher } from "../leqi-speed"
import { bytesToHex, pySlice } from "../py-compat"

export class Mi5elitePatcher extends LeqiSpeedPatcher {
  static override FIRMWARE_SIZE = 0x9880

  readonly SIG_SPEED_LIMIT_HIJACK: Signature = [
    0x98,
    0xf8,
    0x05,
    0x00,
    null,
    0x49,
    0x00,
    0xeb,
    0x80,
    0x00,
    0x40,
    0x00,
    0x08,
    0x80,
  ]
  readonly SIG_SPEED_LIMIT_DST: Signature = [
    0xdf,
    0xf8,
    null,
    0x81,
    0xa8,
    0xf8,
    0x00,
    0x10,
    null,
    0x49,
    0x67,
    0x45,
  ]
  readonly SIG_MOTOR_START: Signature = [
    0x01, 0x80, 0x2d, 0x2b, 0xef, 0xd3, 0x11, 0x70, 0x70, 0xbd, 0x14, 0x33, 0x2d, 0x2b, 0x07, 0xd2,
  ]

  private ldrPatchOffset: number | null = null
  private defaultPathAddress: number | null = null
  private patchedPathAddress: number | null = null
  private ldrR0Offset: number | null = null
  private ldrR1Offset: number | null = null

  protected override locatePatchOffsets(): void {
    try {
      this.ldrPatchOffset = findPattern(this.data, this.SIG_SPEED_LIMIT_HIJACK)
    } catch (error) {
      if (!(error instanceof SignatureNotFoundError)) throw error
      throw new FirmwarePatchError(
        "signature_not_found",
        "Could not find speed limit signature for patching"
      )
    }

    try {
      this.injectOffset =
        findPattern(this.data, this.SIG_SPEED_LIMIT_DST) + this.SIG_SPEED_LIMIT_DST.length + 2
    } catch (error) {
      if (!(error instanceof SignatureNotFoundError)) throw error
      throw new FirmwarePatchError("signature_not_found", "Could not find speed logic destination")
    }

    this.defaultPathAddress = this.ldrPatchOffset + 6
    this.patchedPathAddress = this.ldrPatchOffset + 12

    const modeDataAddr = findPattern(this.data, [0x8a, 0x01, 0x00, 0x20])
    const ldrR0Pc = (this.ldrPatchOffset + 4) & ~3
    this.ldrR0Offset = modeDataAddr - ldrR0Pc

    const r1DataAddr = findPattern(this.data, [0xa4, 0x01, 0x00, 0x20])
    const ldrR1Pc = (this.injectOffset + 4) & ~3
    this.ldrR1Offset = r1DataAddr - ldrR1Pc
  }

  protected override applyHijackPatch(): PatchOp {
    if (this.ldrPatchOffset === null || this.injectOffset === null || this.ldrR0Offset === null) {
      throw new FirmwarePatchError("patch_failed", "speed limit offsets missing")
    }
    const branchAsm = `ldr r0, [pc, #${this.ldrR0Offset}]\nldrb r0, [r0, #0]\nb ${hexNum(this.injectOffset)}`
    const branchBytes = this.assembly(branchAsm, this.ldrPatchOffset)
    if (branchBytes.length !== 6) {
      throw new FirmwarePatchError(
        "encoding_failed",
        `Branch patch must be 6 bytes, got ${branchBytes.length}`
      )
    }
    const pre = pySlice(this.data, this.ldrPatchOffset, this.ldrPatchOffset + 6)
    this.data.set(branchBytes, this.ldrPatchOffset)
    return op("branch_patch", this.ldrPatchOffset, bytesToHex(pre), bytesToHex(branchBytes))
  }

  protected override buildSpeedLogicAsm(): string {
    if (
      this.ldrR1Offset === null ||
      this.patchedPathAddress === null ||
      this.defaultPathAddress === null
    ) {
      throw new FirmwarePatchError("patch_failed", "speed logic offsets missing")
    }
    let asm = `ldr r1, [pc, #${this.ldrR1Offset}]\n`
    asm += this.buildModeCheckAsm("r0", "r0", hexNum(this.patchedPathAddress))
    asm += `default_case:\nldrb.w r0, [r8, #5]\nb ${hexNum(this.defaultPathAddress)}\n`
    return asm
  }

  protected override speedLimitFix(): PatchOp[] {
    const results: PatchOp[] = []
    let ofsSig: number
    try {
      ofsSig = findPattern(this.data, this.SIG_SPEED_LIMIT_DST)
    } catch (error) {
      if (error instanceof SignatureNotFoundError) return results
      throw error
    }
    const ofs = ofsSig + this.SIG_SPEED_LIMIT_DST.length
    const branchTarget = ofs + 130
    const post = this.assembly(`b ${hexNum(branchTarget)}`, ofs)
    const pre = pySlice(this.data, ofs, ofs + post.length)
    if (sameBytes(pre, post)) return results

    this.data.set(post, ofs)
    results.push(op("speed_limit_fix", ofs, bytesToHex(pre), bytesToHex(post)))
    return results
  }

  override motorStartSpeed(kmh: number): PatchOp[] {
    const results: PatchOp[] = []
    const ofsSig = findPattern(this.data, this.SIG_MOTOR_START)

    const speed = this.calcSpeed(kmh, 10, 0) as number
    const speedHyst = Math.floor(speed / 2)

    let ofs = ofsSig + 2
    let pre = pySlice(this.data, ofs, ofs + 1)
    let post = Uint8Array.of(speed & 0xff)
    this.data.set(post, ofs)
    results.push(op("motor_start_speed_threshold_1", ofs, bytesToHex(pre), bytesToHex(post)))

    ofs = ofsSig + 10
    pre = pySlice(this.data, ofs, ofs + 1)
    post = Uint8Array.of(speedHyst & 0xff)
    this.data.set(post, ofs)
    results.push(op("motor_start_speed_hysteresis", ofs, bytesToHex(pre), bytesToHex(post)))

    ofs = ofsSig + 12
    pre = pySlice(this.data, ofs, ofs + 1)
    post = Uint8Array.of(speed & 0xff)
    this.data.set(post, ofs)
    results.push(op("motor_start_speed_threshold_2", ofs, bytesToHex(pre), bytesToHex(post)))
    return results
  }
}

function hexNum(value: number): string {
  return `0x${value.toString(16)}`
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
