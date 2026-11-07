/** Port of bwpatcher/modules/mi5.py (pinned 95a8f33). */

import { LKS32Patcher } from "../core-lks32"
import { op, type PatchOp } from "../core"
import { FirmwarePatchError } from "../errors"
import { findPattern, type Signature } from "../pattern"
import { bytesToHex, pySlice } from "../py-compat"

export class Mi5Patcher extends LKS32Patcher {
  override SNS: ReadonlyArray<Signature> = [
    [0x84, 0xec, 0x00, 0x00],
    [0xcd, 0xee, 0x00, 0x00],
  ]
  override SIG_CCU: Signature = [0x12, 0x68, 0x91, 0x4b, 0x9a, 0x42, 0x1a, 0xd0]

  readonly sigBranchSrc: Signature = [0x59, 0x68, null, 0x4a, null, 0x3a, 0x91, 0x42]
  readonly sigBranchSrcDst: Signature = [0xf5, 0x31, 0x41, 0x81, 0x70, 0xbd]

  override speedLimitDrive(kmh: number): PatchOp[] {
    const ret = this.branchFromTo(this.sigBranchSrc, this.sigBranchSrcDst, "speed_limit_fix")
    const sig: Signature = [null, 0x49, 0x41, 0x82, 0xcb, 0x25, 0x05, 0x80]
    const sigDst: Signature = [0x59, 0x68, null, 0x4a, null, 0x3a, 0x91, 0x42, null, null]

    const ofs = findPattern(this.data, sig) + 4
    const ofsDst = findPattern(this.data, sigDst, null, ofs) + sigDst.length

    const [speedOfs, ldrOfs] = LKS32Patcher.safeLdr(ofs, ofsDst)
    const speed = this.calcSpeed(kmh) as Uint8Array
    const preValue = pySlice(this.data, speedOfs, speedOfs + 4)
    this.data.set(speed, speedOfs)
    ret.push(op("speed_limit_drive_value", speedOfs, bytesToHex(preValue), bytesToHex(speed)))

    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly(`ldr r5,[pc, #${ldrOfs}]`)
    if (post.length !== 2)
      throw new FirmwarePatchError("encoding_failed", "Wrong length of post bytes")
    this.data.set(post, ofs)
    ret.push(op("speed_limit_drive", ofs, bytesToHex(pre), bytesToHex(post)))
    return ret
  }

  override speedLimitSport(kmh: number): PatchOp[] {
    const ret = this.branchFromTo(this.sigBranchSrc, this.sigBranchSrcDst, "speed_limit_fix")
    const sig: Signature = [0xfd, 0x21, 0x41, 0x80, null, 0x49, 0x81, 0x61]
    const sigDst: Signature = [0x59, 0x68, null, 0x4a, null, 0x3a, 0x91, 0x42, null, null]

    const ofs = findPattern(this.data, sig)
    const ofsDst = findPattern(this.data, sigDst, null, ofs) + sigDst.length + 4

    const [speedOfs, ldrOfs] = LKS32Patcher.safeLdr(ofs, ofsDst)
    const speed = this.calcSpeed(kmh) as Uint8Array
    const preValue = pySlice(this.data, speedOfs, speedOfs + 4)
    this.data.set(speed, speedOfs)
    ret.push(op("speed_limit_sport_value", speedOfs, bytesToHex(preValue), bytesToHex(speed)))

    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly(`ldr r1,[pc, #${ldrOfs}]`)
    if (post.length !== 2)
      throw new FirmwarePatchError("encoding_failed", "Wrong length of post bytes")
    this.data.set(post, ofs)
    ret.push(op("speed_limit_sport", ofs, bytesToHex(pre), bytesToHex(post)))
    return ret
  }

  override removeSpeedLimitSport(): PatchOp[] {
    return this.speedLimitSport(36.7)
  }

  override motorStartSpeed(kmh: number): PatchOp[] {
    const ret: PatchOp[] = []
    const sig: Signature = [
      0x1e,
      0x29,
      0x15,
      0xda,
      null,
      null,
      0x14,
      0x29,
      0x10,
      0xd2,
      0x49,
      0x1c,
      null,
      null,
      0x10,
      0xe0,
    ]
    let ofs = findPattern(this.data, sig)

    const speedMin = this.calcSpeed(1, 10, 0) as number
    for (let i = 0; i < 2; i++) {
      let speed = this.calcSpeed(kmh, 10, 0) as number
      if (i === 0) speed = Math.floor((speed + speedMin) / 2)
      ofs += sig.length * i
      const pre = pySlice(this.data, ofs, ofs + 2)
      const post = this.assembly(`cmp r1,#${speed}`)
      if (pre.length !== post.length) {
        throw new FirmwarePatchError("encoding_failed", "motor_start_speed length mismatch")
      }
      this.data.set(post, ofs)
      ret.push(op(`motor_start_speed_${i}`, ofs, bytesToHex(pre), bytesToHex(post)))
    }
    return ret
  }
}
