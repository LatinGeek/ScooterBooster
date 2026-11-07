import { NextResponse } from "next/server"
import type { ApiResponse } from "@/lib/api-response"
import { FIRMWARE_LIMITS, NO_STORE_HEADERS } from "./config"
import type { PatchLogEntry } from "./contract"

/** JSON success envelope with no-store. */
export function jsonOk<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status, headers: NO_STORE_HEADERS })
}

export interface PatchLogHeader {
  value: string | null
  truncated: boolean
}

/** base64url(JSON) bounded to 4 KiB of *encoded* output; omitted (not cut) when larger. */
export function encodePatchLogHeader(log: PatchLogEntry[]): PatchLogHeader {
  const encoded = Buffer.from(JSON.stringify(log), "utf8").toString("base64url")
  if (encoded.length > FIRMWARE_LIMITS.maxPatchLogHeaderBytes) {
    return { value: null, truncated: true }
  }
  return { value: encoded, truncated: false }
}

export interface BinaryResultInput {
  data: Uint8Array
  filename: string
  model: string
  inputSha256: string
  outputSha256: string
  inputSize: number
  log: PatchLogEntry[]
}

export function binaryPatchResponse(input: BinaryResultInput): NextResponse<ApiResponse<never>> {
  const headers = new Headers({
    "content-type": "application/octet-stream",
    "content-disposition": `attachment; filename="${input.filename}"`,
    "content-length": String(input.data.byteLength),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-firmware-model": input.model,
    "x-firmware-input-sha256": input.inputSha256,
    "x-firmware-output-sha256": input.outputSha256,
    "x-firmware-input-size": String(input.inputSize),
    "x-firmware-output-size": String(input.data.byteLength),
  })
  const log = encodePatchLogHeader(input.log)
  if (log.value) headers.set("x-firmware-patch-log", log.value)
  if (log.truncated) headers.set("x-firmware-patch-log-truncated", "1")

  return new NextResponse(input.data as unknown as BodyInit, { status: 200, headers }) as unknown as NextResponse<
    ApiResponse<never>
  >
}
