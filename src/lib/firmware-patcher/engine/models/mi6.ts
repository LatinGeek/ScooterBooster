/** Port of bwpatcher/modules/mi6.py (pinned 95a8f33). */

import { op, type PatchOp } from "../core"
import { FirmwarePatchError, SignatureNotFoundError } from "../errors"
import { findPattern, type Signature } from "../pattern"
import { LeqiPaddingSpeedPatcher } from "../leqi-speed"
import { bytesToHex, pySlice } from "../py-compat"

export class Mi6Patcher extends LeqiPaddingSpeedPatcher {
  static override FIRMWARE_SIZE = 0xa800

  readonly SIG_SPEED_CALC_ANCHOR_V1: Signature = [
    0x98, 0xf8, 0x05, 0x20, 0x4a, 0x4b, 0x02, 0xeb, 0x82, 0x02, 0x52, 0x00, 0x1a, 0x80,
  ]
  readonly SIG_SPEED_CALC_ANCHOR_V2: Signature = [
    0x9c, 0xf8, 0x05, 0x00, 0x49, 0x4a, 0x00, 0xeb, 0x80, 0x00, 0x40, 0x00, 0x10, 0x80,
  ]
  override SIG_SPEED_CALC_ANCHOR: Signature = this.SIG_SPEED_CALC_ANCHOR_V1
  override OUTPUT_PTR_LDR_OFFSET = 4

  readonly SIG_REGION_LIMIT_ANCHOR_V1: Signature = [
    0x82,
    0x4b,
    null,
    null,
    null,
    null,
    null,
    null,
    0x67,
    0xe0,
    0xdf,
    0xe8,
    0x01,
    0xf0,
    0x10,
    0x05,
    0x03,
    0x03,
    0x03,
    0x00,
    0xcf,
    0x22,
    0x01,
    0xe0,
    0x40,
    0xf2,
    0x01,
    0x12,
    0x1a,
    0x80,
  ]
  readonly SIG_REGION_LIMIT_ANCHOR_V2: Signature = [
    0xdc, 0x20, 0x01, 0xe0, 0x40, 0xf2, 0x13, 0x10, 0x38, 0x80,
  ]
  readonly STOCK_REGION_LIMIT_GATE = Uint8Array.of(0x05, 0x29, 0x0b, 0xd2, 0x00, 0xe0)

  readonly REGION_JUMPTABLE_OFFSET = 0x0e
  readonly REGION_JUMPTABLE_LEN = 5
  readonly REGION_JUMPTABLE_STOCK = Uint8Array.of(0x10, 0x05, 0x03, 0x03, 0x03)
  readonly REGION_JUMPTABLE_PATCH = Uint8Array.of(0x05, 0x05, 0x05, 0x05, 0x05)
  readonly REGION_MOVW_IMM_OFFSET_V1 = 0x1a
  readonly REGION_MOVW_IMM_STOCK_V1 = 0x01
  readonly REGION_MOVW_IMM_PATCH = 0x5e

  readonly REGION_SKIP_BRANCH_OFFSET_V2 = 2
  readonly REGION_SKIP_BRANCH_STOCK = Uint8Array.of(0x01, 0xe0)
  readonly REGION_SKIP_BRANCH_PATCH = Uint8Array.of(0x00, 0xbf)
  readonly REGION_MOVW_IMM_OFFSET_V2 = 6
  readonly REGION_MOVW_IMM_STOCK_V2 = 0x13

  readonly SIG_MOTOR_START: Signature = [
    0x2d,
    0x29,
    0x3f,
    0x78,
    null,
    0x97,
    0x03,
    0xdd,
    0x01,
    0x27,
    0x89,
    0xf8,
    0x03,
    0x70,
  ]
  readonly SIG_MOTOR_START_RAMP: Signature = [0x96, 0x29, null, null, 0x1e, 0x29]
  readonly SIG_MOTOR_START_RAMP_SUB: Signature = [0xa1, 0xf1, 0x1e, 0x05]

  private regionLimitSigOfs: number | null = null
  private fwVariant: "v1" | "v2" | null = null

  constructor(data: Uint8Array) {
    super(data)
    this.detectVariant()
  }

  private detectVariant(): void {
    try {
      findPattern(this.data, this.SIG_SPEED_CALC_ANCHOR_V1)
      this.fwVariant = "v1"
      this.SIG_SPEED_CALC_ANCHOR = this.SIG_SPEED_CALC_ANCHOR_V1
      return
    } catch (error) {
      if (!(error instanceof SignatureNotFoundError)) throw error
    }
    try {
      findPattern(this.data, this.SIG_SPEED_CALC_ANCHOR_V2)
      this.fwVariant = "v2"
      this.SIG_SPEED_CALC_ANCHOR = this.SIG_SPEED_CALC_ANCHOR_V2
      return
    } catch (error) {
      if (!(error instanceof SignatureNotFoundError)) throw error
    }
    this.fwVariant = null
    this.SIG_SPEED_CALC_ANCHOR = this.SIG_SPEED_CALC_ANCHOR_V1
  }

  private resolveRegionLimitAnchor(): [number, "v1" | "v2"] {
    if (this.regionLimitSigOfs !== null) {
      if (this.fwVariant === null) {
        throw new FirmwarePatchError("patch_failed", "region limit variant missing")
      }
      return [this.regionLimitSigOfs, this.fwVariant]
    }
    try {
      const sigOfs = findPattern(this.data, this.SIG_REGION_LIMIT_ANCHOR_V1)
      this.regionLimitSigOfs = sigOfs
      return [sigOfs, "v1"]
    } catch (error) {
      if (!(error instanceof SignatureNotFoundError)) throw error
    }
    try {
      const sigOfs = findPattern(this.data, this.SIG_REGION_LIMIT_ANCHOR_V2)
      this.regionLimitSigOfs = sigOfs
      return [sigOfs, "v2"]
    } catch (error) {
      if (!(error instanceof SignatureNotFoundError)) throw error
    }
    throw new SignatureNotFoundError("region limit anchor")
  }

  private patchSite(
    name: string,
    offset: number,
    stock: Uint8Array,
    post: Uint8Array
  ): PatchOp | null {
    const pre = pySlice(this.data, offset, offset + post.length)
    if (sameBytes(pre, post)) return null
    if (!sameBytes(pre, stock)) {
      throw new FirmwarePatchError(
        "unexpected_bytes",
        `Region limit patch @0x${offset.toString(16).toUpperCase()}: expected ${bytesToHex(stock)}, found ${bytesToHex(pre)}`
      )
    }
    this.data.set(post, offset)
    return op(name, offset, bytesToHex(pre), bytesToHex(post))
  }

  private applyRegionLimit(): PatchOp[] {
    let sigOfs: number
    let variant: "v1" | "v2"
    try {
      ;[sigOfs, variant] = this.resolveRegionLimitAnchor()
    } catch (error) {
      if (error instanceof SignatureNotFoundError) return []
      throw error
    }

    const sites: Array<[string, number, Uint8Array, Uint8Array]> =
      variant === "v1"
        ? [
            [
              "region_limit_jumptable",
              sigOfs + this.REGION_JUMPTABLE_OFFSET,
              this.REGION_JUMPTABLE_STOCK,
              this.REGION_JUMPTABLE_PATCH,
            ],
            [
              "region_limit_movw",
              sigOfs + this.REGION_MOVW_IMM_OFFSET_V1,
              Uint8Array.of(this.REGION_MOVW_IMM_STOCK_V1),
              Uint8Array.of(this.REGION_MOVW_IMM_PATCH),
            ],
          ]
        : [
            [
              "region_limit_nop",
              sigOfs + this.REGION_SKIP_BRANCH_OFFSET_V2,
              this.REGION_SKIP_BRANCH_STOCK,
              this.REGION_SKIP_BRANCH_PATCH,
            ],
            [
              "region_limit_movw",
              sigOfs + this.REGION_MOVW_IMM_OFFSET_V2,
              Uint8Array.of(this.REGION_MOVW_IMM_STOCK_V2),
              Uint8Array.of(this.REGION_MOVW_IMM_PATCH),
            ],
          ]

    const results: PatchOp[] = []
    for (const [name, offset, stock, post] of sites) {
      const patch = this.patchSite(name, offset, stock, post)
      if (patch) results.push(patch)
    }
    return results
  }

  protected override speedLimitFix(): PatchOp[] {
    return this.applyRegionLimit()
  }

  override motorStartSpeed(kmh: number): PatchOp[] {
    const results: PatchOp[] = []
    const speed = (this.calcSpeed(kmh, 10, 0) as number) & 0xff

    const ofs = findPattern(this.data, this.SIG_MOTOR_START)
    let pre = pySlice(this.data, ofs, ofs + 1)
    let post = Uint8Array.of(speed)
    this.data.set(post, ofs)
    results.push(op("motor_start_speed_enable", ofs, bytesToHex(pre), bytesToHex(post)))

    const rampOfs = findPattern(this.data, this.SIG_MOTOR_START_RAMP)
    const immOfs = rampOfs + 4
    pre = pySlice(this.data, immOfs, immOfs + 1)
    post = Uint8Array.of(speed)
    this.data.set(post, immOfs)
    results.push(op("motor_start_speed_ramp", immOfs, bytesToHex(pre), bytesToHex(post)))

    const subOfs = findPattern(this.data, this.SIG_MOTOR_START_RAMP_SUB)
    const subImmOfs = subOfs + 2
    pre = pySlice(this.data, subImmOfs, subImmOfs + 1)
    post = Uint8Array.of(speed)
    this.data.set(post, subImmOfs)
    results.push(op("motor_start_speed_ramp_sub", subImmOfs, bytesToHex(pre), bytesToHex(post)))
    return results
  }

  protected override buildSpeedLogicAsm(): string {
    if (this.returnAddress === null || this.outputPtr === null) {
      throw new FirmwarePatchError("patch_failed", "speed logic offsets missing")
    }
    if (this.fwVariant === "v2") {
      const reload = "ldrb.w r0, [ip, #5]\nldrb.w r3, [ip, #2]\n"
      return this.buildPaddingSpeedLogicAsm(
        reload,
        "r3",
        "r0",
        "r2",
        this.returnAddress,
        this.outputPtr
      )
    }
    const reload = "ldrb.w r2, [r8, #5]\nldrb.w r1, [r8, #2]\n"
    return this.buildPaddingSpeedLogicAsm(
      reload,
      "r1",
      "r2",
      "r3",
      this.returnAddress,
      this.outputPtr
    )
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
