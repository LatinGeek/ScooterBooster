/** Port of bwpatcher/modules/mi5pro.py (pinned 95a8f33). */

import { ES32Patcher } from "../core-es32"
import { op, type PatchOp } from "../core"
import { SignatureNotFoundError } from "../errors"
import { extractLdrOffset, findPattern, offsetToNearestWord, type Signature } from "../pattern"
import { bytesToHex, pySlice } from "../py-compat"

export class Mi5proPatcher extends ES32Patcher {
  readonly SIG_MODES: Signature = [null, 0x49, 0x09, 0x88, null, 0xe7, 0x01, 0x88, null, 0xe7]
  readonly ofsModes: number

  constructor(data: Uint8Array) {
    super(data)
    this.ofsModes = findPattern(this.data, this.SIG_MODES)
  }

  override regionFree(): PatchOp[] {
    const res: PatchOp[] = []

    const sig: Signature = [0xc8, 0x03, 0x00, 0x20, null, 0x03, 0x00, 0x20]
    let ofs = findPattern(this.data, sig)
    let tmpByte: number | null = null
    for (let i = 0; i < 7; i++) {
      ofs += 4

      if (tmpByte && this.data[ofs + 1] !== tmpByte) continue
      tmpByte = this.data[ofs + 1] ?? null

      const pre = pySlice(this.data, ofs, ofs + 4)
      const post = Uint8Array.of(0x28, 0x03, 0x00, 0x20)
      this.data.set(post, ofs)
      res.push(op(`region_free_${i}`, ofs, bytesToHex(pre), bytesToHex(post)))
    }

    const sig2: Signature = [null, 0x8b, null, 0x82, null, 0x48, 0x00, 0x78]
    ofs = findPattern(this.data, sig2) + sig2.length
    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly("cmp r0,#0xff")
    this.data.set(post, ofs)
    res.push(op("region_free_fix", ofs, bytesToHex(pre), bytesToHex(post)))
    return res
  }

  private removeSpeedCheck(): PatchOp[] {
    const sig: Signature = [0x00, 0x88, 0x09, 0xb2, 0x81, 0x42, 0x00, 0xdd, 0xa0, 0x82]
    const ofs = findPattern(this.data, sig)
    const pre = pySlice(this.data, ofs, ofs + sig.length)
    const nop = this.assembly("nop")
    const post = new Uint8Array(nop.length * Math.floor(sig.length / 2))
    for (let i = 0; i < Math.floor(sig.length / 2); i++) post.set(nop, i * nop.length)
    if (pre.length !== post.length) {
      throw new SignatureNotFoundError("Pattern not found!")
    }
    this.data.set(post, ofs)
    return [op("remove_speed_check", ofs, bytesToHex(pre), bytesToHex(post))]
  }

  override speedLimitDrive(speed: number): PatchOp[] {
    const res: PatchOp[] = []
    const preModes = pySlice(this.data, this.ofsModes, this.ofsModes + 2)

    let ofs = this.ofsModes + 2
    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly("nop")
    this.data.set(post, ofs)
    res.push(op("speed_limit_drive_0", ofs, bytesToHex(pre), bytesToHex(post)))

    try {
      const ofsLdr = extractLdrOffset(this.disassembly(preModes))
      if (ofsLdr === null) throw new Error("no ldr offset")
      ofs = offsetToNearestWord(this.ofsModes + ofsLdr)
      const preValue = pySlice(this.data, ofs, ofs + 4)
      const value = this.calcSpeed(speed, 20.9, 4) as Uint8Array
      this.data.set(value, ofs)
      res.push(op("speed_limit_drive_1", ofs, bytesToHex(preValue), bytesToHex(value)))
    } catch {
      throw new SignatureNotFoundError("Pattern not found!")
    }

    try {
      res.push(...this.removeSpeedCheck())
    } catch (error) {
      if (!(error instanceof SignatureNotFoundError)) throw error
    }
    return res
  }

  override speedLimitSport(speed: number): PatchOp[] {
    const res: PatchOp[] = []
    const sig: Signature = [null, 0x48, 0x01, 0x29, null, 0xd0]
    const ofsSig = findPattern(this.data, sig)
    const preSig = pySlice(this.data, ofsSig, ofsSig + 2)

    const ofs = this.ofsModes + 6
    const pre = pySlice(this.data, ofs, ofs + 2)
    const post = this.assembly("mov r1,r0")
    this.data.set(post, ofs)
    res.push(op("speed_limit_sport_0", ofs, bytesToHex(pre), bytesToHex(post)))

    try {
      const ofsLdr = extractLdrOffset(this.disassembly(preSig))
      if (ofsLdr === null) throw new Error("no ldr offset")
      const valueOfs = offsetToNearestWord(ofsSig + ofsLdr)
      const preValue = pySlice(this.data, valueOfs, valueOfs + 4)
      const value = this.calcSpeed(speed, 20.9, 4) as Uint8Array
      this.data.set(value, valueOfs)
      res.push(op("speed_limit_sport_1", valueOfs, bytesToHex(preValue), bytesToHex(value)))
    } catch {
      throw new SignatureNotFoundError("Pattern not found!")
    }

    try {
      res.push(...this.removeSpeedCheck())
    } catch (error) {
      if (!(error instanceof SignatureNotFoundError)) throw error
    }
    return res
  }

  override removeSpeedLimitSport(): PatchOp[] {
    return this.speedLimitSport(36.7)
  }
}
