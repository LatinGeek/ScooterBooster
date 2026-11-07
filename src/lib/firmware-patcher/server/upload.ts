import type { NextRequest } from "next/server"
import { FIRMWARE_LIMITS } from "./config"
import { fileTooLarge, invalidUpload } from "./errors"
import { hasBinExtension } from "./filename"

export interface ParsedUpload {
  bytes: Uint8Array
  /** Raw client filename. Only ever passed through the sanitizer; never logged or audited. */
  rawName: string
  size: number
  /** All non-file string fields, already restricted to the allowlist. */
  fields: Record<string, string>
}

function isFileLike(value: unknown): value is File {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as File).arrayBuffer === "function" &&
    typeof (value as File).size === "number"
  )
}

/**
 * Reads the multipart body with every bound enforced before the file is copied into memory.
 * `allowedFields` are the only string fields accepted besides `file`; anything else is rejected.
 */
export async function readFirmwareUpload(req: NextRequest, allowedFields: readonly string[]): Promise<ParsedUpload> {
  const contentType = req.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    throw invalidUpload('Envía el firmware como formulario multipart (campo "file").')
  }

  const declaredHeader = req.headers.get("content-length")
  const declared = declaredHeader === null ? Number.NaN : Number(declaredHeader)
  if (
    Number.isFinite(declared) &&
    declared > FIRMWARE_LIMITS.maxInputBytes + FIRMWARE_LIMITS.multipartOverheadBytes
  ) {
    throw fileTooLarge()
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    throw invalidUpload("No se pudo leer el formulario enviado. Revisa el archivo e intenta de nuevo.")
  }

  const files: unknown[] = []
  const fields: Record<string, string> = {}
  for (const [key, value] of form.entries()) {
    if (key === "file") {
      files.push(value)
      continue
    }
    if (!allowedFields.includes(key) || typeof value !== "string") {
      throw invalidUpload("El formulario contiene campos no permitidos.")
    }
    if (Object.prototype.hasOwnProperty.call(fields, key)) {
      throw invalidUpload("El formulario contiene campos repetidos.")
    }
    fields[key] = value
  }

  if (files.length !== 1) {
    throw invalidUpload("Envía exactamente un archivo .bin.")
  }
  const file = files[0]
  if (!isFileLike(file)) {
    throw invalidUpload("Envía exactamente un archivo .bin.")
  }
  if (file.size === 0) {
    throw invalidUpload("El archivo está vacío.")
  }
  if (file.size > FIRMWARE_LIMITS.maxInputBytes) {
    throw fileTooLarge()
  }
  if (!hasBinExtension(file.name)) {
    throw invalidUpload("El archivo debe tener extensión .bin.")
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  // Defensive: the size reported by the File must match what was actually read.
  if (bytes.byteLength === 0) throw invalidUpload("El archivo está vacío.")
  if (bytes.byteLength > FIRMWARE_LIMITS.maxInputBytes) throw fileTooLarge()

  return { bytes, rawName: file.name, size: bytes.byteLength, fields }
}

/** Strict boolean form field: absent => false, otherwise exactly "true" or "false". */
export function parseStrictBoolean(value: string | undefined, field: string): boolean {
  if (value === undefined || value === "false") return false
  if (value === "true") return true
  throw invalidUpload(`El campo ${field} debe ser "true" o "false".`)
}
