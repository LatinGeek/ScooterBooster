/**
 * Port of bwpatcher/core_es32.py (pinned 95a8f33): ES32 (BrightWay) base patcher.
 */

import type { Signature } from "./pattern"
import { findPattern } from "./pattern"
import { CorePatcher, bytesEqual, op, readU16BE, type PatchOp } from "./core"
import { FirmwarePatchError } from "./errors"
import { bytesToHex, intToBytesLE, pyInt, pySlice } from "./py-compat"

export class ES32Patcher extends CorePatcher {
  protected calcSpeed(kmh: number, factor = 20.9, size = 2): number | Uint8Array {
    if (size === 0) return pyInt(factor * kmh)
    return intToBytesLE(pyInt(factor * kmh), size)
  }

  override fixChecksum(): PatchOp[] {
    const sig = Array.from("SZMC-ES-ZM-", (c) => c.charCodeAt(0))
    const ofsSig = findPattern(this.data, sig)

    const ofs = ofsSig + 0x20
    const size = readU16BE(this.data, ofs - 0x2a)
    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = CorePatcher.computeChecksum(this.data, ofs + 0x50, size)
    this.data.set(post.subarray(0, 2), ofs)

    const headerOfs = ofsSig - 0x10
    const res = super.fixChecksum(headerOfs)
    return [op("fix_checksum", headerOfs, bytesToHex(pre), bytesToHex(post)), ...res]
  }

  override cruiseControlEnable(): PatchOp[] {
    const sig: Signature = [
      0xca,
      0x09,
      0x1a,
      0x70,
      0x4a,
      0x06,
      null,
      0x4b,
      0xd2,
      0x0f,
      0x1a,
      0x70,
      0x8a,
      0x06,
      null,
      0x4b,
      0xd2,
      0x0f,
      0x1a,
      0x70,
    ]
    const ofs = findPattern(this.data, sig) + sig.length - 4
    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly("movs r2,#0x1")
    this.data.set(post, ofs)
    return [op("cruise_control_enable", ofs, bytesToHex(pre), bytesToHex(post))]
  }

  override motorStartSpeed(kmh: number): PatchOp[] {
    const res: PatchOp[] = []
    const sigs: Signature[] = [
      [
        0x00, 0x99, 0x68, 0x29, 0x0e, 0xdb, 0x9a, 0x49, 0x09, 0x78, 0x01, 0x29, 0x09, 0xd0, 0x09,
        0xe0,
      ],
      [0x00, 0x99, 0x3e, 0x29, 0x01, 0xda, 0xc4, null, 0xf8, 0xe7],
    ]
    const speedMin = this.calcSpeed(1, 20.9, 0) as number
    for (let i = 0; i < sigs.length; i++) {
      const sig = sigs[i]
      if (!sig) continue
      let speed = this.calcSpeed(kmh, 20.9, 0) as number
      if (i === 1) speed = Math.floor((speed + speedMin) / 2)

      const ofs = findPattern(this.data, sig) + 2
      const pre = pySlice(this.data, ofs, ofs + 2)
      const post = this.assembly(`cmp r1,#${speed}`)
      if (!bytesEqual(pre, post) && post.length !== 2) {
        throw new FirmwarePatchError(
          "encoding_failed",
          "motor_start_speed produced a non-16-bit cmp"
        )
      }
      this.data.set(post, ofs)
      res.push(op(`motor_start_speed_${i}`, ofs, bytesToHex(pre), bytesToHex(post)))
    }
    return res
  }
}
