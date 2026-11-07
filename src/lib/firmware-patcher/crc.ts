/**
 * Checksums used by the upstream patchers (SPEC 4.5). All pure, allocation-light and exact.
 *
 *  - crc16Ccitt   : core.py            crcmod(poly=0x11021, init=0, rev=False, xorOut=0), stored big-endian
 *  - crc32Lks32   : core_lks32.py      crcmod(0x104C11DB7, init=0xFFFFFFFF, rev=False), input padded with
 *                                      0xFF to a multiple of 4, stored little-endian
 *  - crc16N32     : core_n32.py        poly 0x8005, init 0xFFFF, input bytes and result bit-reversed,
 *                                      stored big-endian
 */

const CRC16_CCITT_TABLE = (() => {
  const table = new Uint16Array(256)
  for (let i = 0; i < 256; i++) {
    let crc = i << 8
    for (let j = 0; j < 8; j++)
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    table[i] = crc
  }
  return table
})()

const CRC32_MPEG2_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let crc = (i << 24) >>> 0
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x80000000 ? ((crc << 1) ^ 0x04c11db7) >>> 0 : (crc << 1) >>> 0
    }
    table[i] = crc
  }
  return table
})()

/** CRC-16/CCITT as used by `CorePatcher._compute_checksum` (a.k.a. CRC-16/XMODEM). */
export function crc16Ccitt(data: Uint8Array): number {
  let crc = 0
  for (let i = 0; i < data.length; i++) {
    crc = ((crc << 8) & 0xffff) ^ (CRC16_CCITT_TABLE[((crc >> 8) ^ (data[i] ?? 0)) & 0xff] ?? 0)
  }
  return crc
}

export function crc16CcittBytes(data: Uint8Array): Uint8Array {
  const crc = crc16Ccitt(data)
  return Uint8Array.of((crc >> 8) & 0xff, crc & 0xff)
}

/** LKS32 CRC-32 (MPEG-2 flavour) over `data` padded with 0xFF to a multiple of 4 bytes. */
export function crc32Lks32(data: Uint8Array): number {
  let crc = 0xffffffff
  const padLen = (4 - (data.length % 4)) % 4
  for (let i = 0; i < data.length; i++) {
    crc =
      (((crc << 8) >>> 0) ^ (CRC32_MPEG2_TABLE[((crc >>> 24) ^ (data[i] ?? 0)) & 0xff] ?? 0)) >>> 0
  }
  for (let i = 0; i < padLen; i++) {
    crc = (((crc << 8) >>> 0) ^ (CRC32_MPEG2_TABLE[((crc >>> 24) ^ 0xff) & 0xff] ?? 0)) >>> 0
  }
  return crc >>> 0
}

export function crc32Lks32Bytes(data: Uint8Array): Uint8Array {
  const crc = crc32Lks32(data)
  return Uint8Array.of(crc & 0xff, (crc >>> 8) & 0xff, (crc >>> 16) & 0xff, (crc >>> 24) & 0xff)
}

export function bitReverse8(value: number): number {
  let result = 0
  for (let i = 0; i < 8; i++) if (value & (1 << i)) result |= 1 << (7 - i)
  return result & 0xff
}

export function bitReverse16(value: number): number {
  let result = 0
  for (let i = 0; i < 16; i++) if (value & (1 << i)) result |= 1 << (15 - i)
  return result & 0xffff
}

const REVERSE8 = (() => {
  const table = new Uint8Array(256)
  for (let i = 0; i < 256; i++) table[i] = bitReverse8(i)
  return table
})()

/** N32 CRC-16 with bit reversal (`CoreN32Patcher.crc16_with_bit_reversal`), polynomial 0x8005. */
export function crc16N32(data: Uint8Array): number {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= (REVERSE8[data[i] ?? 0] ?? 0) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x8005) & 0xffff : (crc & 0x7fff) << 1
    }
  }
  return bitReverse16(crc)
}
