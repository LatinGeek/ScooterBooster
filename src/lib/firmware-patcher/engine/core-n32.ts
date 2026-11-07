/**
 * Port of bwpatcher/core_n32.py (pinned 95a8f33): N32 / Leqi full-image handling.
 *
 * A Leqi `.bin` is `[0x80-byte header][XOR-0xAA body][footer]`; the body length is the
 * little-endian uint16 at header[0x0E]. The patcher works on the decoded body and `chk`
 * re-encrypts + refreshes the embedded CRC-16.
 */

import { crc16N32 } from "../crc"
import type { Signature } from "./pattern"
import { findPattern } from "./pattern"
import { CorePatcher, bytesEqual, op, readU16BE, type PatchOp } from "./core"
import { FirmwarePatchError } from "./errors"
import { bytesToHex, intToBytesLE, pyInt, pySlice, concatBytes } from "./py-compat"

function xorAA(data: Uint8Array): Uint8Array {
  const out = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) out[i] = (data[i] ?? 0) ^ 0xaa
  return out
}

export class CoreN32Patcher extends CorePatcher {
  static FIRMWARE_SIZE = 0x9880

  static readonly ENCRYPTION_KEY = 0xaa
  static readonly FIRMWARE_OFFSET = 0x80
  static readonly HEADER_TAG = Uint8Array.of(0x45, 0x55, 0x31, 0x00) // "EU1\0"
  static readonly HEADER_TAG_OFFSET = 0x0a
  static readonly HEADER_SIZE_FIELD_OFFSET = 0x0e
  static readonly CRC_START_OFFSET = 0x40
  static readonly MIN_FIRMWARE_SIZE = 0x42
  static readonly MIN_PADDING_LENGTH = 500
  static readonly ALIGNMENT_BOUNDARY = 128

  imageHeader: Uint8Array | null = null
  imageFooter: Uint8Array | null = null
  headerFirmwareSize: number | null = null
  wasEncrypted = false

  constructor(data: Uint8Array) {
    const ctor = new.target as typeof CoreN32Patcher
    const firmwareSize = ctor.FIRMWARE_SIZE

    const headerSize = ctor.parseHeaderFirmwareSize(data)
    let firmwareData: Uint8Array = data
    let imageHeader: Uint8Array | null = null
    let imageFooter: Uint8Array | null = null
    if (headerSize !== null || data.length >= CoreN32Patcher.FIRMWARE_OFFSET + firmwareSize) {
      ;[firmwareData, imageHeader, imageFooter] = ctor.extractFirmwareFromImage(data, firmwareSize)
    }

    const wasEncrypted = ctor.isEncryptedData(firmwareData, headerSize, firmwareSize)
    if (wasEncrypted) firmwareData = xorAA(firmwareData)

    super(firmwareData)
    this.imageHeader = imageHeader
    this.imageFooter = imageFooter
    this.headerFirmwareSize = headerSize
    this.wasEncrypted = wasEncrypted
  }

  // -------------------------------------------------------------------------
  // Image format helpers (static so they can run before `super`)
  // -------------------------------------------------------------------------

  static readHeaderSizeField(headerData: Uint8Array): number | null {
    if (headerData.length < CoreN32Patcher.HEADER_SIZE_FIELD_OFFSET + 2) return null
    const tag = headerData.subarray(
      CoreN32Patcher.HEADER_TAG_OFFSET,
      CoreN32Patcher.HEADER_TAG_OFFSET + CoreN32Patcher.HEADER_TAG.length
    )
    if (!bytesEqual(tag, CoreN32Patcher.HEADER_TAG)) return null
    const value =
      (headerData[CoreN32Patcher.HEADER_SIZE_FIELD_OFFSET] ?? 0) |
      ((headerData[CoreN32Patcher.HEADER_SIZE_FIELD_OFFSET + 1] ?? 0) << 8)
    if (value < 0x400) return null
    return value
  }

  static parseHeaderFirmwareSize(fullImageData: Uint8Array): number | null {
    const size = CoreN32Patcher.readHeaderSizeField(fullImageData)
    if (size === null) return null
    if (CoreN32Patcher.FIRMWARE_OFFSET + size > fullImageData.length) return null
    return size
  }

  static extractFirmwareFromImage(
    fullImageData: Uint8Array,
    firmwareSize: number
  ): [Uint8Array, Uint8Array, Uint8Array] {
    let bodySize = CoreN32Patcher.parseHeaderFirmwareSize(fullImageData)
    if (bodySize === null) bodySize = firmwareSize

    if (fullImageData.length === bodySize)
      return [fullImageData, new Uint8Array(0), new Uint8Array(0)]

    if (fullImageData.length < CoreN32Patcher.FIRMWARE_OFFSET + bodySize) {
      throw new FirmwarePatchError(
        "container_invalid",
        `Image too small: ${fullImageData.length} bytes, expected at least ${CoreN32Patcher.FIRMWARE_OFFSET + bodySize} bytes`
      )
    }

    const imageHeader = fullImageData.slice(0, CoreN32Patcher.FIRMWARE_OFFSET)
    const firmwareData = fullImageData.slice(
      CoreN32Patcher.FIRMWARE_OFFSET,
      CoreN32Patcher.FIRMWARE_OFFSET + bodySize
    )
    const imageFooter = fullImageData.slice(CoreN32Patcher.FIRMWARE_OFFSET + bodySize)
    return [firmwareData, imageHeader, imageFooter]
  }

  static insertFirmwareIntoImage(
    firmwareData: Uint8Array,
    imageHeader: Uint8Array,
    imageFooter: Uint8Array,
    firmwareSize: number
  ): Uint8Array {
    let expectedSize = CoreN32Patcher.readHeaderSizeField(imageHeader)
    if (expectedSize === null) expectedSize = firmwareSize

    if (firmwareData.length !== expectedSize) {
      throw new FirmwarePatchError(
        "patch_failed",
        `Firmware size mismatch: ${firmwareData.length} bytes, expected ${expectedSize} bytes`
      )
    }
    if (imageHeader.length !== CoreN32Patcher.FIRMWARE_OFFSET) {
      throw new FirmwarePatchError(
        "container_invalid",
        `Header size mismatch: ${imageHeader.length} bytes, expected ${CoreN32Patcher.FIRMWARE_OFFSET} bytes`
      )
    }
    return concatBytes(imageHeader, firmwareData, imageFooter)
  }

  static computeFirmwareSize(firmwareData: Uint8Array, headerSize: number | null): number {
    if (headerSize !== null) return headerSize

    const data = firmwareData
    let maxPaddingLength = 0
    let maxPaddingEnd = 0

    let i = 0
    while (i < data.length) {
      const paddingByte = data[i]
      if (paddingByte === 0xaa || paddingByte === 0x00) {
        const start = i
        while (i < data.length && data[i] === paddingByte) i++
        const length = i - start
        if (length > maxPaddingLength && length > CoreN32Patcher.MIN_PADDING_LENGTH) {
          maxPaddingLength = length
          maxPaddingEnd = i
        }
      } else {
        i++
      }
    }

    if (maxPaddingEnd > 0) {
      return (
        Math.floor(
          (maxPaddingEnd + CoreN32Patcher.ALIGNMENT_BOUNDARY - 1) /
            CoreN32Patcher.ALIGNMENT_BOUNDARY
        ) * CoreN32Patcher.ALIGNMENT_BOUNDARY
      )
    }
    return data.length
  }

  static verifyCrc(
    firmware: Uint8Array,
    headerSize: number | null,
    firmwareSize: number
  ): [boolean, number, number] {
    void firmwareSize
    const fwSize = CoreN32Patcher.computeFirmwareSize(firmware, headerSize)
    if (fwSize < CoreN32Patcher.MIN_FIRMWARE_SIZE) {
      throw new FirmwarePatchError(
        "patch_failed",
        `Firmware too small (${fwSize} bytes), need at least ${CoreN32Patcher.MIN_FIRMWARE_SIZE} bytes`
      )
    }
    const crcEnd = fwSize - 2
    const embedded = readU16BE(firmware, crcEnd)
    const calculated = crc16N32(pySlice(firmware, CoreN32Patcher.CRC_START_OFFSET, crcEnd))
    return [embedded === calculated, embedded, calculated]
  }

  static isEncryptedData(
    firmware: Uint8Array,
    headerSize: number | null,
    firmwareSize: number
  ): boolean {
    try {
      return CoreN32Patcher.verifyCrc(firmware, headerSize, firmwareSize)[0]
    } catch {
      return false
    }
  }

  // -------------------------------------------------------------------------
  // Instance API
  // -------------------------------------------------------------------------

  protected get firmwareSize(): number {
    return (this.constructor as unknown as typeof CoreN32Patcher).FIRMWARE_SIZE
  }

  calculateFirmwareSize(firmwareData: Uint8Array): number {
    return CoreN32Patcher.computeFirmwareSize(firmwareData, this.headerFirmwareSize)
  }

  patchFirmwareCrc(firmwareData?: Uint8Array): Uint8Array {
    const firmware = (firmwareData ?? this.data).slice()
    const fwSize = this.calculateFirmwareSize(firmware)
    if (fwSize < CoreN32Patcher.MIN_FIRMWARE_SIZE) {
      throw new FirmwarePatchError(
        "patch_failed",
        `Firmware too small (${fwSize} bytes), need at least ${CoreN32Patcher.MIN_FIRMWARE_SIZE} bytes`
      )
    }
    const crcEnd = fwSize - 2
    const correct = crc16N32(pySlice(firmware, CoreN32Patcher.CRC_START_OFFSET, crcEnd))
    firmware[crcEnd] = (correct >> 8) & 0xff
    firmware[crcEnd + 1] = correct & 0xff
    if (firmwareData === undefined) this.data = firmware
    return firmware
  }

  verifyFirmwareCrc(firmwareData?: Uint8Array): [boolean, number, number] {
    return CoreN32Patcher.verifyCrc(
      firmwareData ?? this.data,
      this.headerFirmwareSize,
      this.firmwareSize
    )
  }

  isEncrypted(firmwareData?: Uint8Array): boolean {
    try {
      return this.verifyFirmwareCrc(firmwareData)[0]
    } catch {
      return false
    }
  }

  encryptFirmware(): Uint8Array {
    this.data = xorAA(this.data)
    return this.data
  }

  decryptFirmware(): Uint8Array {
    return this.encryptFirmware()
  }

  override fixChecksum(): PatchOp[] {
    if (this.wasEncrypted && !this.isEncrypted()) this.encryptFirmware()

    const fwSize = this.calculateFirmwareSize(this.data)
    const offset = fwSize - 2
    const before = pySlice(this.data, offset, offset + 2)
    this.patchFirmwareCrc()
    const after = pySlice(this.data, offset, offset + 2)
    return [op("fix_checksum", offset, bytesToHex(before), bytesToHex(after))]
  }

  override createFullImage(): PatchOp[] {
    if (this.imageHeader !== null && this.imageFooter !== null) {
      this.data = CoreN32Patcher.insertFirmwareIntoImage(
        this.data,
        this.imageHeader,
        this.imageFooter,
        this.firmwareSize
      )
      return [op("create_full_image", "0x0", "N/A", "Image re-assembled")]
    }
    return [op("create_full_image", "0x0", "N/A", "No header/footer found, skipping")]
  }

  /** Upstream `_calc_speed` with size=0 returning a number. */
  protected calcSpeed(speed: number, factor = 10, size = 1): number | Uint8Array {
    const value = pyInt(factor * speed)
    return size === 0 ? value : intToBytesLE(value, size)
  }

  // Shared constants so model subclasses can use them.
  protected static readonly N32 = {
    FIRMWARE_OFFSET: 0x80,
  }
}

/** Re-export so model modules do not import `pattern` just to type-signature arrays. */
export type { Signature }
export { findPattern }
