/**
 * Port of bwpatcher/core_lks32.py (pinned 95a8f33): LKS32 (BrightWay) base patcher.
 */

import { crc32Lks32Bytes } from "../crc"
import type { Signature } from "./pattern"
import { findPattern } from "./pattern"
import { CorePatcher, bytesEqual, op, readU32LE, type PatchOp } from "./core"
import { FirmwarePatchError } from "./errors"
import { bytesToHex, intToBytesLE, pyInt, pySlice } from "./py-compat"

export class LKS32Patcher extends CorePatcher {
  /** Optional cruise-control unlock signature (mi5/mi5max). */
  SIG_CCU?: Signature
  /** Optional region-free needles (mi5/mi5max). */
  SNS?: ReadonlyArray<ReadonlyArray<number | null>>

  /** Upstream `_branch_from_to`. */
  protected branchFromTo(
    sig: Signature,
    sigDst: Signature,
    description: string,
    dstOffset = 4
  ): PatchOp[] {
    const ofs = findPattern(this.data, sig) + sig.length
    const ofsDst = findPattern(this.data, sigDst, null, ofs) + dstOffset
    const pre = pySlice(this.data, ofs, ofs + 2)
    // Upstream assembles at address 0 with `ofs_dst - ofs` as an *absolute* target.
    const post = this.assembly(`b ${ofsDst - ofs}`)
    if (!bytesEqual(pre, post)) {
      this.data.set(post, ofs)
      return [op(description, ofs, bytesToHex(pre), bytesToHex(post))]
    }
    return []
  }

  /** Upstream `_safe_ldr`: returns [literal address, PC-relative aligned offset]. */
  static safeLdr(ldrOffset: number, dstOfs: number): [number, number] {
    const pcBase = (ldrOffset & ~0x3) + 4
    let minOff = dstOfs - pcBase
    if (minOff < 0) {
      throw new FirmwarePatchError(
        "patch_failed",
        "Minimum destination offset is earlier than PC_base"
      )
    }
    if (minOff % 4 !== 0) minOff = (minOff & ~0x3) + 4
    const ldrOfsVal = Math.ceil(minOff / 4)
    return [pcBase + ldrOfsVal * 4, minOff]
  }

  /** LKS32 CRC-32 over `data[offset:offset+size]`, padded with 0xFF, little-endian. */
  static override computeChecksum(data: Uint8Array, offset: number, size: number): Uint8Array {
    if (size > data.length) {
      throw new FirmwarePatchError("patch_failed", "Error: File is shorter than expected range.")
    }
    return crc32Lks32Bytes(pySlice(data, offset, offset + size))
  }

  protected cruiseControlUnlock(): PatchOp[] {
    if (!this.SIG_CCU) return []
    const sig = this.SIG_CCU
    const ofs = findPattern(this.data, sig)
    const pre = pySlice(this.data, ofs, ofs + sig.length)
    const post = concatN(this.assembly("nop"), Math.floor(sig.length / 2))
    if (pre.length !== post.length) {
      throw new FirmwarePatchError("patch_failed", "cruise_control_unlock length mismatch")
    }
    this.data.set(post, ofs)
    return [op("cruise_control_unlock", ofs, bytesToHex(pre), bytesToHex(post))]
  }

  protected calcSpeed(kmh: number, factor = 10, size = 4): number | Uint8Array {
    if (size === 0) return pyInt(kmh * factor)
    return intToBytesLE(pyInt(kmh * factor), size)
  }

  override fixChecksum(): PatchOp[] {
    const sig = Array.from("LKS32MC0", (c) => c.charCodeAt(0))
    const ofs = findPattern(this.data, sig) - 0x8

    if (!bytesEqual(pySlice(this.data, ofs - 2, ofs), Uint8Array.of(0xff, 0xff))) return []

    const size = readU32LE(this.data, ofs)
    const pre = pySlice(this.data, ofs + 4, ofs + 8)
    const post = LKS32Patcher.computeChecksum(this.data, ofs + 0x18, size)
    this.data.set(post, ofs + 4)

    const res = super.fixChecksum(ofs)
    return [op("fix_checksum", ofs, bytesToHex(pre), bytesToHex(post)), ...res]
  }

  override fakeDrvVersion(version: string): PatchOp[] {
    if (!/^[0-9]+$/.test(version)) {
      throw new FirmwarePatchError(
        "invalid_selection",
        `Firmware version must contain only digits: ${version}`
      )
    }
    if (version.length !== 4) {
      throw new FirmwarePatchError(
        "invalid_selection",
        `Firmware version must have 4 digits: ${version}`
      )
    }
    const sig: Signature = [
      0x6f,
      0x6b,
      0x0d,
      null,
      null,
      null,
      null,
      0x0d,
      0x65,
      0x72,
      0x72,
      0x6f,
      0x72,
    ]
    const ofs = findPattern(this.data, sig) + 3
    const pre = pySlice(this.data, ofs, ofs + 4)
    const post = Uint8Array.from(version, (c) => c.charCodeAt(0))
    this.data.set(post, ofs)
    return [op("fake_drv_version", ofs, bytesToHex(pre), bytesToHex(post))]
  }

  override cruiseControlEnable(): PatchOp[] {
    const res: PatchOp[] = []
    const sig: Signature = [
      0x81,
      0x06,
      null,
      0x4b,
      0xc9,
      0x0f,
      0x19,
      0x70,
      0x01,
      0x07,
      null,
      0x4b,
      0xc9,
      0x0f,
      0x19,
      0x70,
    ]
    const ofs = findPattern(this.data, sig) + 4
    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly("movs r1, #0x1")
    this.data.set(post, ofs)
    res.push(op("cruise_control_enable", ofs, bytesToHex(pre), bytesToHex(post)))
    res.push(...this.cruiseControlUnlock())
    return res
  }

  override regionFree(): PatchOp[] {
    if (!this.SNS) return []
    const res: PatchOp[] = []
    let i = 0
    for (const sn of this.SNS) {
      let ofs = 0
      for (;;) {
        try {
          ofs = findPattern(this.data, sn, null, ofs + 1)
        } catch {
          break
        }
        const pre = pySlice(this.data, ofs, ofs + 4)
        const post = Uint8Array.of(0, 0, 0, 0)
        this.data.set(post, ofs)
        res.push(op(`region_free_${i}`, ofs, bytesToHex(pre), bytesToHex(post)))
        i++
      }
    }
    return res
  }
}

function concatN(part: Uint8Array, count: number): Uint8Array {
  const out = new Uint8Array(part.length * count)
  for (let i = 0; i < count; i++) out.set(part, i * part.length)
  return out
}
