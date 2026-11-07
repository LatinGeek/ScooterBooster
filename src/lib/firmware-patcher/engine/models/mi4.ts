/** Port of bwpatcher/modules/mi4.py (pinned 95a8f33). */

import { firstOperandRegister } from "../../assembler/decoder"
import { LKS32Patcher } from "../core-lks32"
import { op, type PatchOp } from "../core"
import { FirmwarePatchError } from "../errors"
import { findPattern, type Signature } from "../pattern"
import { bytesToHex, intToBytesLE, pyInt, pySlice } from "../py-compat"

export class Mi4Patcher extends LKS32Patcher {
  readonly sigBranchSrc: Signature = [0x20, 0x31, null, 0x72, 0x0f, null, null, 0x72]
  readonly sigBranchDst: Signature = [0xf5, 0x31, 0x01, 0x83, 0x11, 0x48]

  override dashboardMaxSpeed(speed: number): PatchOp[] {
    if (!(speed >= 1.0 && speed <= 29.6)) {
      throw new FirmwarePatchError("invalid_selection", "Speed must be between 1.0 and 29.6km/h")
    }
    const value = pyInt((speed / 2) * 10)
    const sig: Signature = [0x01, 0x46, 0xf3, 0x39, 0x11, 0x29, 0x00, 0xd2, 0xff, 0x20]
    const ofs = findPattern(this.data, sig)

    const ifAsm = `MOVS R1, #${value}\nLSLS R1,R1,#0x1\nCMP R1,R0\nBCS 10\nMOVS R0, R1\n`
    const post = this.assembly(ifAsm)
    if (post.length !== 10) {
      throw new FirmwarePatchError("encoding_failed", "wrong length of post bytes")
    }
    const pre = pySlice(this.data, ofs, ofs + post.length)
    this.data.set(post, ofs)
    return [op("dashboard_max_speed", ofs, bytesToHex(pre), bytesToHex(post))]
  }

  override speedLimitDrive(kmh: number): PatchOp[] {
    const ret = this.branchFromTo(this.sigBranchSrc, this.sigBranchDst, "speed_limit_fix")
    const sig: Signature = [0xca, null, null, 0x80, null, null, 0xb9, 0x21, null, 0x80]
    const ofs = findPattern(this.data, sig)
    const ofsDst =
      findPattern(this.data, this.sigBranchSrc, null, ofs) + this.sigBranchSrc.length + 2

    const [speedOfs, ldrOfs] = LKS32Patcher.safeLdr(ofs, ofsDst)
    const speed = intToBytesLE(pyInt(kmh * 10), 4)
    const preValue = pySlice(this.data, speedOfs, speedOfs + 4)
    this.data.set(speed, speedOfs)
    ret.push(op("speed_limit_drive_value", speedOfs, bytesToHex(preValue), bytesToHex(speed)))

    const pre = pySlice(this.data, ofs, ofs + 2)
    const reg = firstOperandRegister(pre, "r4")
    const post = this.assembly(`ldr ${reg},[pc, #${ldrOfs}]`)
    if (post.length !== 2)
      throw new FirmwarePatchError("encoding_failed", "Wrong length of post bytes")
    this.data.set(post, ofs)
    ret.push(op("speed_limit_drive", ofs, bytesToHex(pre), bytesToHex(post)))
    return ret
  }

  override speedLimitSport(kmh: number): PatchOp[] {
    const ret = this.branchFromTo(this.sigBranchSrc, this.sigBranchDst, "speed_limit_fix")
    const sig: Signature = [0xfc, 0x21, 0x41, 0x80, 0x78, 0x21, 0x81, 0x81]
    const ofs = findPattern(this.data, sig)
    const ofsDst =
      findPattern(this.data, this.sigBranchSrc, null, ofs) + this.sigBranchSrc.length + 6

    const [speedOfs, ldrOfs] = LKS32Patcher.safeLdr(ofs, ofsDst)
    const speed = intToBytesLE(pyInt(kmh * 10), 4)
    const preValue = pySlice(this.data, speedOfs, speedOfs + 4)
    this.data.set(speed, speedOfs)
    ret.push(op("speed_limit_sport_value", speedOfs, bytesToHex(preValue), bytesToHex(speed)))

    const pre = pySlice(this.data, ofs, ofs + 2)
    const reg = firstOperandRegister(pre, "r1")
    const post = this.assembly(`ldr ${reg},[pc, #${ldrOfs}]`)
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
