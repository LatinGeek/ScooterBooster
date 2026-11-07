/** Port of bwpatcher/modules/mi6lite.py (pinned 95a8f33). */

import { op, type PatchOp } from "../core"
import { FirmwarePatchError, SignatureNotFoundError } from "../errors"
import { findPattern, type Signature } from "../pattern"
import { LeqiPaddingSpeedPatcher } from "../leqi-speed"
import { bytesToHex, pySlice } from "../py-compat"

export class Mi6litePatcher extends LeqiPaddingSpeedPatcher {
  static override FIRMWARE_SIZE = 0xb000

  override SIG_SPEED_CALC_ANCHOR: Signature = [
    0x48, 0x79, 0x54, 0x49, 0x00, 0xeb, 0x80, 0x00, 0x40, 0x00, 0x08, 0x80,
  ]
  override OUTPUT_PTR_LDR_OFFSET = 2

  readonly SIG_REGION_LIMIT_ANCHOR_V1: Signature = [
    0x67,
    0x4f,
    null,
    null,
    null,
    null,
    null,
    null,
    0xd1,
    0x18,
    0x0b,
    0xd0,
    0x01,
    0x29,
    0x0c,
    0xd1,
    0x06,
    0xe0,
    0x01,
    0x28,
    0x04,
    0xd0,
    0xa0,
    0xf5,
    0x80,
    0x71,
    0x1f,
    0x39,
    0x05,
    0xd1,
    0x01,
    0xe0,
    0xcf,
    0x21,
    0x01,
    0xe0,
    0x40,
    0xf2,
    0x01,
    0x11,
    0x39,
    0x80,
  ]
  readonly SIG_REGION_LIMIT_ANCHOR_V2: Signature = [
    0xdc, 0x21, 0x01, 0xe0, 0x40, 0xf2, 0x13, 0x11, 0x11, 0x80,
  ]

  readonly REGION_CMP_BEQ_OFFSET = 4
  readonly REGION_SKIP_BRANCH_OFFSET_V1 = 0x22
  readonly REGION_MOVW_IMM_OFFSET_V1 = 0x26

  readonly REGION_CMP_BEQ_STOCK = Uint8Array.of(0x0c, 0xd0)
  readonly REGION_CMP_BEQ_PATCH = Uint8Array.of(0x0c, 0xe0)
  readonly REGION_SKIP_BRANCH_STOCK = Uint8Array.of(0x01, 0xe0)
  readonly REGION_SKIP_BRANCH_PATCH = Uint8Array.of(0x00, 0xbf)
  readonly REGION_MOVW_IMM_STOCK_V1 = 0x01
  readonly REGION_MOVW_IMM_PATCH = 0x5e

  readonly REGION_SKIP_BRANCH_OFFSET_V2 = 2
  readonly REGION_MOVW_IMM_OFFSET_V2 = 6
  readonly REGION_MOVW_IMM_STOCK_V2 = 0x13

  readonly SIG_MOTOR_START: Signature = [
    0x01, 0x80, 0x2d, 0x2d, 0xef, 0xd3, 0x11, 0x70, 0xf0, 0xbd, 0x1e, 0x2d, 0x07, 0xd2,
  ]
  readonly SIG_MOTOR_START_PRIMARY: Signature = [0xbc, 0xf1, 0xf5, 0x0f, 0x0f, 0xda, 0x1e, 0x2d]

  private regionLimitSigOfs: number | null = null
  private regionVariant: "v1" | "v2" | null = null

  private resolveRegionLimitAnchor(): [number, "v1" | "v2"] {
    if (this.regionLimitSigOfs !== null) {
      if (this.regionVariant === null) {
        throw new FirmwarePatchError("patch_failed", "region limit variant missing")
      }
      return [this.regionLimitSigOfs, this.regionVariant]
    }
    try {
      const sigOfs = findPattern(this.data, this.SIG_REGION_LIMIT_ANCHOR_V1)
      this.regionLimitSigOfs = sigOfs
      this.regionVariant = "v1"
      return [sigOfs, "v1"]
    } catch (error) {
      if (!(error instanceof SignatureNotFoundError)) throw error
    }
    try {
      const sigOfs = findPattern(this.data, this.SIG_REGION_LIMIT_ANCHOR_V2)
      this.regionLimitSigOfs = sigOfs
      this.regionVariant = "v2"
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
              "region_limit_bypass",
              sigOfs + this.REGION_CMP_BEQ_OFFSET,
              this.REGION_CMP_BEQ_STOCK,
              this.REGION_CMP_BEQ_PATCH,
            ],
            [
              "region_limit_nop",
              sigOfs + this.REGION_SKIP_BRANCH_OFFSET_V1,
              this.REGION_SKIP_BRANCH_STOCK,
              this.REGION_SKIP_BRANCH_PATCH,
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
    const ofsSig = findPattern(this.data, this.SIG_MOTOR_START)

    const speed = (this.calcSpeed(kmh, 10, 0) as number) & 0xff
    const acquire = Math.max(1, Math.floor(speed / 2)) & 0xff

    let ofs = ofsSig + 2
    let pre = pySlice(this.data, ofs, ofs + 1)
    let post = Uint8Array.of(speed)
    this.data.set(post, ofs)
    results.push(op("motor_start_speed_threshold", ofs, bytesToHex(pre), bytesToHex(post)))

    ofs = ofsSig + 10
    pre = pySlice(this.data, ofs, ofs + 1)
    post = Uint8Array.of(acquire)
    this.data.set(post, ofs)
    results.push(op("motor_start_speed_acquire", ofs, bytesToHex(pre), bytesToHex(post)))

    const prim = findPattern(this.data, this.SIG_MOTOR_START_PRIMARY)
    ofs = prim + 6
    pre = pySlice(this.data, ofs, ofs + 1)
    post = Uint8Array.of(speed)
    this.data.set(post, ofs)
    results.push(op("motor_start_speed_primary", ofs, bytesToHex(pre), bytesToHex(post)))
    return results
  }

  protected override buildSpeedLogicAsm(): string {
    if (this.returnAddress === null || this.outputPtr === null) {
      throw new FirmwarePatchError("patch_failed", "speed logic offsets missing")
    }
    const reload = "ldrb r0, [r1, #5]\nldrb r2, [r1, #2]\n"
    return this.buildPaddingSpeedLogicAsm(
      reload,
      "r2",
      "r0",
      "r1",
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
