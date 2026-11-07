/** Port of bwpatcher/modules/ultra4.py (pinned 95a8f33). */

import { LKS32Patcher } from "../core-lks32"
import { op, type PatchOp } from "../core"
import { FirmwarePatchError } from "../errors"
import { findPattern, type Signature } from "../pattern"
import { bytesToHex, intToBytesLE, pyInt, pyRound, pySlice } from "../py-compat"

const CURRENT_PER_SPEED = 3
const CURRENT_SOFT_CAP = 1000

export class Ultra4Patcher extends LKS32Patcher {
  readonly sigBranchSrc: Signature = [0xcb, 0x73, null, null, 0x03, 0x80, null, null, 0x41, 0x80]
  readonly sigBranchSrcDst: Signature = [0x45, 0x81, 0x85, 0x81, null, 0x48]
  readonly sigDriveCurrent: Signature = [0xc1, 0x80, null, 0x4d, 0x05, 0x81]
  readonly sigSportCurrent: Signature = [0xb9, 0x21, 0x89, 0x00, 0x41, 0x81, 0x81, 0x81]

  private branchSite(): number {
    return findPattern(this.data, this.sigBranchSrc) + this.sigBranchSrc.length
  }

  private static currentForSpeed(kmh: number): number {
    return Math.min(CURRENT_SOFT_CAP, pyRound(kmh * 10 * CURRENT_PER_SPEED))
  }

  private patchDriveCurrent(kmh: number): PatchOp[] {
    const ofs = findPattern(this.data, this.sigDriveCurrent)
    const ldrOfs = ofs + 2
    const imm = this.data[ldrOfs] ?? 0
    const pcBase = (ldrOfs + 4) & ~3
    const pool = pcBase + imm * 4
    const value = intToBytesLE(Ultra4Patcher.currentForSpeed(kmh), 4)
    const pre = pySlice(this.data, pool, pool + 4)
    this.data.set(value, pool)
    return [op("speed_limit_drive_current", pool, bytesToHex(pre), bytesToHex(value))]
  }

  private patchSportCurrent(kmh: number): PatchOp[] {
    const ofs = findPattern(this.data, this.sigSportCurrent)
    const [poolOfs, ldrImm] = LKS32Patcher.safeLdr(ofs, this.branchSite() + 2 + 8)
    const value = intToBytesLE(Ultra4Patcher.currentForSpeed(kmh), 4)
    const prePool = pySlice(this.data, poolOfs, poolOfs + 4)
    this.data.set(value, poolOfs)

    const pre = pySlice(this.data, ofs, ofs + 4)
    const post = new Uint8Array([
      ...this.assembly(`ldr r1,[pc, #${ldrImm}]`),
      ...this.assembly("nop"),
    ])
    if (post.length !== 4) {
      throw new FirmwarePatchError("encoding_failed", "wrong length of sport current patch")
    }
    this.data.set(post, ofs)
    return [
      op("speed_limit_sport_current_value", poolOfs, bytesToHex(prePool), bytesToHex(value)),
      op("speed_limit_sport_current", ofs, bytesToHex(pre), bytesToHex(post)),
    ]
  }

  override dashboardMaxSpeed(speed: number): PatchOp[] {
    if (!(speed >= 1.0 && speed <= 29.6)) {
      throw new FirmwarePatchError("invalid_selection", "Speed must be between 1.0 and 29.6km/h")
    }
    const value = pyInt((speed / 2) * 10)

    const sig: Signature = [0x3b, 0x49, 0x0a, 0x88, 0x08, 0x3a, 0x90, 0x42, 0x04, 0xdd]
    const ofs = findPattern(this.data, sig)
    const ifAsm = `MOVS R1,#${value}\nLSLS R1,R1,#0x1\nCMP R0,R1\nBLE #0xe\nMOV R0,R1\nNOP; NOP; NOP; NOP; NOP;\n`
    const post = this.assembly(ifAsm)
    if (post.length !== 20) {
      throw new FirmwarePatchError("encoding_failed", "wrong length of post bytes")
    }
    const pre = pySlice(this.data, ofs, ofs + post.length)
    this.data.set(post, ofs)
    return [op("dashboard_max_speed", ofs, bytesToHex(pre), bytesToHex(post))]
  }

  override motorStartSpeed(speed: number): PatchOp[] {
    if (!(speed >= 1 && speed <= 9)) {
      throw new FirmwarePatchError("invalid_selection", "Speed must be between 1 and 9km/h")
    }
    const kmh = pyRound(-0.36 * speed ** 2 - 5.39 * speed + 68.6) * 3

    const sig: Signature = [0x16, 0xe0, null, 0x88, 0x49, null, null, 0x00, null, 0x42, 0x11, 0xd2]
    const ofs = findPattern(this.data, sig) + 4

    const b = this.data[ofs + 1]
    let reg: number
    if (b === 0x25) reg = 5
    else if (b === 0x26) reg = 6
    else
      throw new FirmwarePatchError(
        "unexpected_bytes",
        `Invalid firmware file: 0x${(b ?? 0).toString(16)}`
      )

    const post = this.assembly(`movs r${reg}, #${kmh}`)
    if (post.length !== 2) {
      throw new FirmwarePatchError("encoding_failed", "wrong length of post bytes")
    }
    const pre = pySlice(this.data, ofs, ofs + 2)
    this.data.set(post, ofs)
    return [op("motor_start_speed", ofs, bytesToHex(pre), bytesToHex(post))]
  }

  override speedLimitDrive(kmh: number): PatchOp[] {
    const ret = this.branchFromTo(this.sigBranchSrc, this.sigBranchSrcDst, "speed_limit_fix")
    const sig: Signature = [0xca, 0x23, 0x03, 0x80]
    const ofs = findPattern(this.data, sig)
    const [speedOfs, ldrOfs] = LKS32Patcher.safeLdr(ofs, this.branchSite() + 2)

    const speed = intToBytesLE(pyInt(kmh * 10), 4)
    const preValue = pySlice(this.data, speedOfs, speedOfs + 4)
    this.data.set(speed, speedOfs)
    ret.push(op("speed_limit_drive_value", speedOfs, bytesToHex(preValue), bytesToHex(speed)))

    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly(`ldr r3,[pc, #${ldrOfs}]`)
    if (post.length !== 2)
      throw new FirmwarePatchError("encoding_failed", "Wrong length of post bytes")
    this.data.set(post, ofs)
    ret.push(op("speed_limit_drive", ofs, bytesToHex(pre), bytesToHex(post)))
    ret.push(...this.patchDriveCurrent(kmh))
    return ret
  }

  override speedLimitSport(kmh: number): PatchOp[] {
    const ret = this.branchFromTo(this.sigBranchSrc, this.sigBranchSrcDst, "speed_limit_fix")
    const sig: Signature = [0xfc, 0x21, 0x41, 0x80]
    const ofs = findPattern(this.data, sig)
    const [speedOfs, ldrOfs] = LKS32Patcher.safeLdr(ofs, this.branchSite() + 2 + 4)

    const speed = intToBytesLE(pyInt(kmh * 10), 4)
    const preValue = pySlice(this.data, speedOfs, speedOfs + 4)
    this.data.set(speed, speedOfs)
    ret.push(op("speed_limit_sport_value", speedOfs, bytesToHex(preValue), bytesToHex(speed)))

    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly(`ldr r1,[pc, #${ldrOfs}]`)
    if (post.length !== 2)
      throw new FirmwarePatchError("encoding_failed", "Wrong length of post bytes")
    this.data.set(post, ofs)
    ret.push(op("speed_limit_sport", ofs, bytesToHex(pre), bytesToHex(post)))
    ret.push(...this.patchSportCurrent(kmh))
    return ret
  }

  override removeSpeedLimitSport(): PatchOp[] {
    return this.speedLimitSport(36.7)
  }
}
