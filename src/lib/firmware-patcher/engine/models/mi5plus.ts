/** Port of bwpatcher/modules/mi5plus.py (pinned 95a8f33). */

import { CorePatcher, op, type PatchOp } from "../core"
import { FirmwarePatchError, SignatureNotFoundError } from "../errors"
import { findPattern, type Signature } from "../pattern"
import { bytesToHex, pyRound, pySlice } from "../py-compat"

type Mode = "ped" | "drive" | "sport"
const MODE_NUMBER: Readonly<Record<Mode, number>> = { ped: 1, drive: 2, sport: 3 }
const MODE_ORDER: readonly Mode[] = ["ped", "drive", "sport"]

export class Mi5plusPatcher extends CorePatcher {
  static readonly NAME = "Xiaomi Electric Scooter 5 Plus"

  readonly SRAM_RIDE_MODE = 0x20000218
  readonly SRAM_UART_MAX_SPEED = 0x20000234

  readonly SIG_UART20_MAX_SPEED_STORE: Signature = [0xab, 0x49, 0x78, 0x7a, 0x08, 0x80]
  readonly HIJACK_SIZE = 4
  readonly HIJACK_OFFSET_IN_SIG = 2

  readonly INJECT_SEARCH_START = 0x1c000
  readonly PADDING_SAFETY_MARGIN = 8
  readonly MIN_PADDING_SIZE = 48

  readonly REGION_PREFIX_DE = Uint8Array.of(0xb7, 0x02, 0x01, 0x00)
  readonly REGION_PREFIX_ES = Uint8Array.of(0xb6, 0x02, 0x01, 0x00)

  protected patchedSpeeds: Partial<Record<Mode, number>> = {}
  protected speedBlockPatched = false
  protected hijackOffset: number | null = null
  protected injectOffset: number | null = null
  protected returnAddress: number | null = null

  constructor(data: Uint8Array) {
    super(data)
    if (this.data.length < 0x6000) {
      throw new FirmwarePatchError("container_invalid", "5 Plus image too short")
    }
  }

  private clampKmh(kmh: number): number {
    const value = pyRound(kmh)
    if (value < 1 || value > 255) {
      throw new FirmwarePatchError(
        "invalid_selection",
        `km/h must be 1..255 for UART max-speed halfword, got ${kmh}`
      )
    }
    return value
  }

  private findUart20MaxSpeedStore(): number {
    return findPattern(this.data, this.SIG_UART20_MAX_SPEED_STORE)
  }

  private findInjectPadding(minSize: number): number {
    const zeroSig = new Array<number | null>(minSize).fill(0)
    let padOfs: number
    try {
      padOfs = findPattern(this.data, zeroSig, null, this.INJECT_SEARCH_START)
    } catch (error) {
      if (!(error instanceof SignatureNotFoundError)) throw error
      throw new FirmwarePatchError(
        "signature_not_found",
        `No ${minSize}-byte zero padding after 0x${this.INJECT_SEARCH_START.toString(16).toUpperCase()}`
      )
    }
    if (padOfs & 1) padOfs += 1
    return padOfs
  }

  private locatePatchOffsets(): void {
    if (this.hijackOffset !== null) return

    const sigOfs = this.findUart20MaxSpeedStore()
    this.hijackOffset = sigOfs + this.HIJACK_OFFSET_IN_SIG
    this.returnAddress = this.hijackOffset + this.HIJACK_SIZE

    const need = this.MIN_PADDING_SIZE + this.PADDING_SAFETY_MARGIN
    const padOfs = this.findInjectPadding(need)
    this.injectOffset = padOfs + this.PADDING_SAFETY_MARGIN
    if (this.injectOffset & 1) this.injectOffset += 1
  }

  private applyHijackPatch(): PatchOp {
    if (this.hijackOffset === null || this.injectOffset === null) {
      throw new FirmwarePatchError("patch_failed", "hijack/inject offset missing")
    }
    const stock = this.SIG_UART20_MAX_SPEED_STORE.slice(
      this.HIJACK_OFFSET_IN_SIG,
      this.HIJACK_OFFSET_IN_SIG + this.HIJACK_SIZE
    )
    const pre = pySlice(this.data, this.hijackOffset, this.hijackOffset + this.HIJACK_SIZE)
    if (!sameBytes(pre, Uint8Array.from(stock))) {
      throw new FirmwarePatchError(
        "unexpected_bytes",
        `Hijack site @0x${this.hijackOffset.toString(16).toUpperCase()}: expected ${bytesToHex(
          Uint8Array.from(stock)
        )}, found ${bytesToHex(pre)}`
      )
    }
    const branch = this.assembly(`b.w ${hexNum(this.injectOffset)}`, this.hijackOffset)
    if (branch.length !== 4) {
      throw new FirmwarePatchError(
        "encoding_failed",
        `expected 4-byte b.w, got ${bytesToHex(branch)}`
      )
    }
    this.data.set(branch, this.hijackOffset)
    return op("hijack_uart20_max_speed", this.hijackOffset, bytesToHex(pre), bytesToHex(branch))
  }

  private buildModeCheckAsm(): string {
    const modes = MODE_ORDER.filter((mode) => this.patchedSpeeds[mode] !== undefined)
    let asm = ""
    modes.forEach((mode, index) => {
      const next = index + 1 < modes.length ? `check_${modes[index + 1]}` : "default_case"
      asm += `check_${mode}:\ncmp r0, #${MODE_NUMBER[mode]}\nbne ${next}\nmovw r0, #${this.patchedSpeeds[mode]}\nb store\n`
    })
    return asm
  }

  private buildSpeedLogicAsm(): string {
    if (this.returnAddress === null)
      throw new FirmwarePatchError("patch_failed", "return address missing")
    return `ldr r2, =${hexNum(this.SRAM_RIDE_MODE)}\nldrb r0, [r2]\nand r0, r0, #3\n${this.buildModeCheckAsm()}default_case:\nldrb r0, [r7, #9]\nstore:\nstrh r0, [r1]\nb.w ${hexNum(this.returnAddress)}\n`
  }

  private verifyInjectSite(patchBytes: Uint8Array): void {
    if (this.injectOffset === null)
      throw new FirmwarePatchError("patch_failed", "inject offset missing")
    const need = patchBytes.length + this.PADDING_SAFETY_MARGIN
    const region = pySlice(this.data, this.injectOffset, this.injectOffset + need)
    if (region.length < need || region.some((b) => b !== 0)) {
      throw new FirmwarePatchError(
        "unexpected_bytes",
        `Inject site @0x${this.injectOffset.toString(16).toUpperCase()} lacks ${need}-byte zero padding (patch=${patchBytes.length} + margin=${this.PADDING_SAFETY_MARGIN})`
      )
    }
  }

  private patchSpeedBlock(pedKmh?: number, driveKmh?: number, sportKmh?: number): PatchOp[] {
    if (pedKmh !== undefined) this.patchedSpeeds.ped = this.clampKmh(pedKmh)
    if (driveKmh !== undefined) this.patchedSpeeds.drive = this.clampKmh(driveKmh)
    if (sportKmh !== undefined) this.patchedSpeeds.sport = this.clampKmh(sportKmh)
    if (Object.keys(this.patchedSpeeds).length === 0) {
      throw new FirmwarePatchError("invalid_selection", "no speed modes specified")
    }

    const results: PatchOp[] = []
    if (!this.speedBlockPatched) {
      this.locatePatchOffsets()
      results.push(this.applyHijackPatch())
    }

    if (this.injectOffset === null)
      throw new FirmwarePatchError("patch_failed", "inject offset missing")
    const asm = this.buildSpeedLogicAsm()
    const patchBytes = this.assembly(asm, this.injectOffset)
    if (!this.speedBlockPatched) this.verifyInjectSite(patchBytes)

    const pre = pySlice(this.data, this.injectOffset, this.injectOffset + patchBytes.length)
    this.data.set(patchBytes, this.injectOffset)
    const name = this.speedBlockPatched ? "speed_constants_updated" : "speed_logic_block"
    results.push(op(name, this.injectOffset, bytesToHex(pre), bytesToHex(patchBytes)))
    this.speedBlockPatched = true
    return results
  }

  override speedLimitPed(kmh: number): PatchOp[] {
    return this.patchSpeedBlock(kmh, undefined, undefined)
  }

  override speedLimitDrive(kmh: number): PatchOp[] {
    return this.patchSpeedBlock(undefined, kmh, undefined)
  }

  override speedLimitSport(kmh: number): PatchOp[] {
    return this.patchSpeedBlock(undefined, undefined, kmh)
  }

  override removeSpeedLimitSport(): PatchOp[] {
    return this.speedLimitSport(35.0)
  }

  override regionFree(): PatchOp[] {
    const res: PatchOp[] = []
    const post = Uint8Array.of(0, 0, 0, 0)
    const regions: Array<[string, Uint8Array]> = [
      ["region_free_de_66231", this.REGION_PREFIX_DE],
      ["region_free_es_66230", this.REGION_PREFIX_ES],
    ]
    for (const [label, needle] of regions) {
      let start = 0
      let n = 0
      for (;;) {
        let ofs: number
        try {
          ofs = findPattern(this.data, Array.from(needle), null, start)
        } catch (error) {
          if (error instanceof SignatureNotFoundError) break
          throw error
        }
        const pre = pySlice(this.data, ofs, ofs + 4)
        this.data.set(post, ofs)
        res.push(op(`${label}_${n}`, ofs, bytesToHex(pre), bytesToHex(post)))
        n++
        start = ofs + 4
      }
    }
    if (res.length === 0) {
      throw new SignatureNotFoundError("no DE/ES region prefix immediates found")
    }
    return res
  }

  override fixChecksum(): PatchOp[] {
    return [op("fix_checksum", "0x0", "skipped", "5plus_plaintext_full_image")]
  }

  override createFullImage(): PatchOp[] {
    return [op("create_full_image", "0x0", "N/A", "already_full_image")]
  }
}

function hexNum(value: number): string {
  return `0x${value.toString(16)}`
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}
