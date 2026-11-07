/** Port of bwpatcher/modules/mi4pro2nd.py (pinned 95a8f33). */

import { ES32Patcher } from "../core-es32"
import { op, type PatchOp } from "../core"
import { findPattern, type Signature } from "../pattern"
import { bytesToHex, pySlice } from "../py-compat"

export class Mi4pro2ndPatcher extends ES32Patcher {
  override regionFree(): PatchOp[] {
    const res: PatchOp[] = []
    const sig: Signature = [0x9c, 0xa7, 0x00, 0x00, 0x22, 0x03, 0x00, 0x20]
    let ofs = findPattern(this.data, sig)
    for (let i = 0; i < 7; i++) {
      ofs += 4
      const pre = pySlice(this.data, ofs, ofs + 4)
      const post = Uint8Array.of(0x21, 0x03, 0x00, 0x20)
      this.data.set(post, ofs)
      res.push(op(`region_free_${i}`, ofs, bytesToHex(pre), bytesToHex(post)))
    }

    const sig2: Signature = [0x60, 0x8b, 0x60, 0x82, 0x56, 0x48, 0x00, 0x78]
    ofs = findPattern(this.data, sig2) + sig2.length
    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly("cmp r0,#0xff")
    this.data.set(post, ofs)
    res.push(op("region_free_fix", ofs, bytesToHex(pre), bytesToHex(post)))
    return res
  }

  override speedLimitDrive(speed: number): PatchOp[] {
    const res: PatchOp[] = []
    const sig: Signature = [0x38, 0x00, 0x39, 0x01, 0xa1, 0x01, 0x39, 0x01, 0x39]
    let ofs = findPattern(this.data, sig)
    const post = this.calcSpeed(speed) as Uint8Array
    for (let i = 0; i < 11; i++) {
      ofs += 2
      const pre = pySlice(this.data, ofs, ofs + 2)
      this.data.set(post, ofs)
      res.push(op(`speed_limit_drive_${i}`, ofs, bytesToHex(pre), bytesToHex(post)))
    }
    return res
  }

  override speedLimitSport(speed: number): PatchOp[] {
    const res: PatchOp[] = []
    const sig: Signature = [0x00, 0x00, 0xa1, 0x01, 0x0a, 0x02, 0xa1, 0x01]
    let ofs = findPattern(this.data, sig)
    const post = this.calcSpeed(speed) as Uint8Array
    for (let i = 0; i < 11; i++) {
      ofs += 2
      const pre = pySlice(this.data, ofs, ofs + 2)
      this.data.set(post, ofs)
      res.push(op(`speed_limit_sport_${i}`, ofs, bytesToHex(pre), bytesToHex(post)))
    }
    return res
  }

  override removeSpeedLimitSport(): PatchOp[] {
    return this.speedLimitSport(36.7)
  }
}
