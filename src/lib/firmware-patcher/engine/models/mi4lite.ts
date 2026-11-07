/** Port of bwpatcher/modules/mi4lite.py (pinned 95a8f33). */

import { LKS32Patcher } from "../core-lks32"
import { op, type PatchOp } from "../core"
import { FirmwarePatchError } from "../errors"
import { findPattern, type Signature } from "../pattern"
import { bytesToHex, intToBytesLE, pyInt, pySlice } from "../py-compat"

export class Mi4litePatcher extends LKS32Patcher {
  readonly sigBranchSrc: Signature = [0x27, 0x4b, 0xd7, 0x18, 0x0a, 0x22, 0x3b, 0x00]
  readonly sigBranchDst: Signature = [0x11, 0x48, 0x00, 0x21, 0x01, 0x70, 0x02, 0x22]

  override speedLimitDrive(kmh: number): PatchOp[] {
    const ret = this.branchFromTo(this.sigBranchSrc, this.sigBranchDst, "speed_limit_fix", 0)
    const sig: Signature = [0xca, 0x24, 0x04, 0x80, null, 0x4d]
    const ofs = findPattern(this.data, sig)
    const ofsDst =
      findPattern(this.data, this.sigBranchSrc, null, ofs) + this.sigBranchSrc.length + 2

    const [speedOfs, ldrOfs] = LKS32Patcher.safeLdr(ofs, ofsDst)
    const speed = intToBytesLE(pyInt(kmh * 10), 4)
    const preValue = pySlice(this.data, speedOfs, speedOfs + 4)
    this.data.set(speed, speedOfs)
    ret.push(op("speed_limit_drive_value", speedOfs, bytesToHex(preValue), bytesToHex(speed)))

    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly(`ldr r4,[pc, #${ldrOfs}]`)
    if (post.length !== 2)
      throw new FirmwarePatchError("encoding_failed", "Wrong length of post bytes")
    this.data.set(post, ofs)
    ret.push(op("speed_limit_drive", ofs, bytesToHex(pre), bytesToHex(post)))
    return ret
  }

  override speedLimitSport(kmh: number): PatchOp[] {
    const ret = this.branchFromTo(this.sigBranchSrc, this.sigBranchDst, "speed_limit_fix", 0)
    const sig: Signature = [0xfc, 0x23, 0x43, 0x80, 0x32, 0x23, 0x83, 0x81]
    const ofs = findPattern(this.data, sig)
    const ofsDst =
      findPattern(this.data, this.sigBranchSrc, null, ofs) + this.sigBranchSrc.length + 6

    const [speedOfs, ldrOfs] = LKS32Patcher.safeLdr(ofs, ofsDst)
    const speed = intToBytesLE(pyInt(kmh * 10), 4)
    const preValue = pySlice(this.data, speedOfs, speedOfs + 4)
    this.data.set(speed, speedOfs)
    ret.push(op("speed_limit_sport_value", speedOfs, bytesToHex(preValue), bytesToHex(speed)))

    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly(`ldr r3,[pc, #${ldrOfs}]`)
    if (post.length !== 2)
      throw new FirmwarePatchError("encoding_failed", "Wrong length of post bytes")
    this.data.set(post, ofs)
    ret.push(op("speed_limit_sport", ofs, bytesToHex(pre), bytesToHex(post)))
    return ret
  }

  override removeSpeedLimitSport(): PatchOp[] {
    return this.speedLimitSport(36.7)
  }
}
