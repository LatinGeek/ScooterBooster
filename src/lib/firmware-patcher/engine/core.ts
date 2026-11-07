/**
 * Port of bwpatcher/core.py (pinned 95a8f33): the base patcher.
 *
 * `data` is a mutable byte buffer local to the request. Nothing here touches the filesystem,
 * the network or a request-scoped store.
 */

import { assemble } from "../assembler/thumb"
import { disassemble } from "../assembler/decoder"
import { crc16CcittBytes } from "../crc"
import type { PatchOperation } from "../types"
import { FirmwarePatchError } from "./errors"
import { bytesToHex, pyHex, pySlice } from "./py-compat"

export type PatchOp = PatchOperation

export function op(name: string, offset: number | string, before: string, after: string): PatchOp {
  return {
    name,
    offset: typeof offset === "number" ? pyHex(offset) : offset,
    before,
    after,
  }
}

export function notImplemented(what: string): never {
  throw new FirmwarePatchError("patch_failed", `${what} is not implemented by the upstream class`)
}

export class CorePatcher {
  data: Uint8Array

  constructor(data: Uint8Array | number[]) {
    this.data = data instanceof Uint8Array ? data.slice() : Uint8Array.from(data)
  }

  /** Upstream `_compute_checksum`: CRC-16/CCITT (poly 0x11021, init 0) over a slice, BE. */
  static computeChecksum(data: Uint8Array, offset: number, size: number): Uint8Array {
    if (size > data.length) {
      throw new FirmwarePatchError("patch_failed", "Error: File is shorter than expected range.")
    }
    return crc16CcittBytes(pySlice(data, offset, offset + size))
  }

  assembly(code: string, addr = 0): Uint8Array {
    return assemble(code, addr)
  }

  disassembly(codeBytes: Uint8Array): string {
    return disassemble(codeBytes)
  }

  dashboardMaxSpeed(speed: number): PatchOp[] {
    void speed
    return notImplemented("dashboard_max_speed")
  }

  speedLimitPed(kmh: number): PatchOp[] {
    void kmh
    return notImplemented("speed_limit_ped")
  }

  speedLimitDrive(kmh: number): PatchOp[] {
    void kmh
    return notImplemented("speed_limit_drive")
  }

  speedLimitSport(kmh: number): PatchOp[] {
    void kmh
    return notImplemented("speed_limit_sport")
  }

  removeSpeedLimitSport(): PatchOp[] {
    return notImplemented("remove_speed_limit_sport")
  }

  regionFree(): PatchOp[] {
    return notImplemented("region_free")
  }

  fakeDrvVersion(version: string): PatchOp[] {
    void version
    return notImplemented("fake_drv_version")
  }

  motorStartSpeed(speed: number): PatchOp[] {
    void speed
    return notImplemented("motor_start_speed")
  }

  cruiseControlEnable(): PatchOp[] {
    return notImplemented("cruise_control_enable")
  }

  /**
   * Upstream `fix_checksum(start_ofs)`: only patches when the two bytes before the payload
   * are `FF FF`, walking the header checksum slot. Returns no operation when it skips.
   */
  fixChecksum(startOfs: number): PatchOp[] {
    if (!bytesEqual(pySlice(this.data, startOfs - 2, startOfs), Uint8Array.of(0xff, 0xff))) {
      return []
    }

    let size: number
    let chkOfs: number
    if (this.data[0] === 0x54 /* 'T' */) {
      size = this.data.length - startOfs
      chkOfs = 0x13
    } else {
      size = readU32BE(this.data, 0)
      chkOfs = 0x0a
    }

    let pre = pySlice(this.data, chkOfs, chkOfs + 2)
    while (bytesEqual(pre, Uint8Array.of(0, 0)) && chkOfs < 0x2e) {
      chkOfs += 0x10
      pre = pySlice(this.data, chkOfs, chkOfs + 2)
    }

    const post = CorePatcher.computeChecksum(this.data, startOfs, size)
    this.data.set(post, chkOfs)
    return [op("fix_checksum_header", chkOfs, bytesToHex(pre), bytesToHex(post))]
  }

  /** Upstream `create_full_image` default is `NotImplementedError`; models override it. */
  createFullImage(): PatchOp[] {
    return notImplemented("create_full_image")
  }
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export function readU16LE(data: Uint8Array, offset: number): number {
  return (data[offset] ?? 0) | ((data[offset + 1] ?? 0) << 8)
}

export function readU16BE(data: Uint8Array, offset: number): number {
  return ((data[offset] ?? 0) << 8) | (data[offset + 1] ?? 0)
}

export function readU32LE(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] ?? 0) |
      ((data[offset + 1] ?? 0) << 8) |
      ((data[offset + 2] ?? 0) << 16) |
      ((data[offset + 3] ?? 0) << 24)) >>>
    0
  )
}

export function readU32BE(data: Uint8Array, offset: number): number {
  return (
    (((data[offset] ?? 0) << 24) |
      ((data[offset + 1] ?? 0) << 16) |
      ((data[offset + 2] ?? 0) << 8) |
      (data[offset + 3] ?? 0)) >>>
    0
  )
}

export function u16leBytes(value: number): Uint8Array {
  return Uint8Array.of(value & 0xff, (value >> 8) & 0xff)
}

export function u16beBytes(value: number): Uint8Array {
  return Uint8Array.of((value >> 8) & 0xff, value & 0xff)
}
