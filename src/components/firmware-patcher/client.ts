import type {
  DetectResponse,
  FirmwarePatcherCapabilities,
  PatchLogEntry,
  PatchResult,
  PatchSelectionEntry,
} from "./api-types"

export const FIRMWARE_PATCHER_API = "/api/admin/firmware-patcher"
/** Fallback when capabilities are not available yet (SPEC FP-003: 4 MiB). */
export const DEFAULT_MAX_INPUT_BYTES = 4 * 1024 * 1024

export type FirmwareErrorKind =
  | "unsupported"
  | "signature"
  | "experimental"
  | "rate_limit"
  | "size"
  | "mss0"
  | "disabled"
  | "auth"
  | "invalid_file"
  | "network"
  | "server"

export interface FirmwareErrorInfo {
  kind: FirmwareErrorKind
  title: string
  message: string
  hint: string
}

/** Error carrying already-localized, stack-free copy that is safe to render. */
export class FirmwarePatcherError extends Error {
  readonly info: FirmwareErrorInfo
  readonly status: number | null

  constructor(info: FirmwareErrorInfo, status: number | null = null) {
    super(info.message)
    this.name = "FirmwarePatcherError"
    this.info = info
    this.status = status
  }
}

const ERROR_COPY: Record<FirmwareErrorKind, Omit<FirmwareErrorInfo, "kind">> = {
  unsupported: {
    title: "Modelo no soportado",
    message: "No pudimos identificar un modelo compatible a partir de este archivo.",
    hint: "Verificá que sea el firmware original (.bin) de un scooter Xiaomi/Brightway soportado. No hay forma de forzar el modelo manualmente.",
  },
  signature: {
    title: "No se encontró la firma esperada",
    message: "El archivo no contiene el patrón de código que este parche necesita modificar.",
    hint: "Puede tratarse de otra versión de firmware. Probá con otro archivo o desactivá el parche que falló.",
  },
  experimental: {
    title: "Falta confirmar los parches experimentales",
    message: "La selección incluye parches experimentales y no se confirmó la advertencia.",
    hint: "Marcá la casilla de confirmación experimental y volvé a aplicar los parches.",
  },
  rate_limit: {
    title: "Demasiados intentos",
    message: "Superaste el límite de operaciones permitidas por ahora.",
    hint: "Esperá un minuto y volvé a intentar. Si el límite diario se agotó, probá de nuevo mañana.",
  },
  size: {
    title: "Archivo demasiado grande",
    message: "El archivo supera el tamaño máximo permitido.",
    hint: "Usá un firmware de hasta 4 MiB.",
  },
  mss0: {
    title: "El experimento MSS0 no es compatible con este archivo",
    message: "Los bytes del firmware no coinciden con los esperados por el parche MSS0 experimental.",
    hint: "El archivo ya fue modificado o es otra versión. Probá con el firmware de fábrica o desactivá MSS0.",
  },
  disabled: {
    title: "Herramienta deshabilitada",
    message: "El parcheador de firmware no está habilitado en este entorno.",
    hint: "Pedile a un administrador que active la función.",
  },
  auth: {
    title: "Sesión o permisos insuficientes",
    message: "Tu sesión venció o tu cuenta no tiene acceso a esta herramienta.",
    hint: "Volvé a iniciar sesión con una cuenta de técnico o administrador.",
  },
  invalid_file: {
    title: "Archivo no válido",
    message: "El archivo no cumple los requisitos para analizarse.",
    hint: "Elegí un único archivo .bin que no esté vacío.",
  },
  network: {
    title: "Sin conexión con el servidor",
    message: "No pudimos comunicarnos con el servidor.",
    hint: "Revisá tu conexión y volvé a intentar.",
  },
  server: {
    title: "No se pudo completar la operación",
    message: "Ocurrió un error inesperado al procesar el firmware.",
    hint: "Volvé a intentar. Si persiste, compartí el código de solicitud con el equipo.",
  },
}

export function errorInfo(kind: FirmwareErrorKind, messageOverride?: string): FirmwareErrorInfo {
  const base = ERROR_COPY[kind]
  return { kind, ...base, message: messageOverride || base.message }
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
}

/**
 * Server messages are Spanish and curated, but the UI never renders anything that looks like a
 * stack trace or an internal path, and caps the length.
 */
export function sanitizeServerMessage(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const firstLine = raw.split(/\r?\n/)[0]?.trim() ?? ""
  if (!firstLine || firstLine.length > 240) return null
  if (/\bat\s+\S+\s*\(|node_modules|[\\/]src[\\/]|\bTypeError\b|\bReferenceError\b|\bRangeError\b/.test(firstLine)) {
    return null
  }
  return firstLine
}

export function classifyError(status: number | null, serverMessage: unknown, code?: unknown): FirmwareErrorInfo {
  const safe = sanitizeServerMessage(serverMessage)
  const haystack = normalize(`${typeof code === "string" ? code : ""} ${safe ?? ""}`)

  if (status === 401 || status === 403) return errorInfo("auth")
  if (status === 404) return errorInfo("disabled")
  if (status === 413) return errorInfo("size")
  if (status === 429) return errorInfo("rate_limit")

  if (/mss0/.test(haystack)) return errorInfo("mss0", safe ?? undefined)
  if (/experiment/.test(haystack)) return errorInfo("experimental", safe ?? undefined)
  if (/firma|signature|patron|pattern|no se encontr/.test(haystack)) {
    return errorInfo("signature", safe ?? undefined)
  }
  if (/no se pudo detectar|modelo|unsupported|no soportad|no compatible|detect/.test(haystack)) {
    return errorInfo("unsupported", safe ?? undefined)
  }
  if (/tamano|grande|size|vacio|empty|\.bin|archivo/.test(haystack)) {
    return errorInfo(/tamano|grande|size/.test(haystack) ? "size" : "invalid_file", safe ?? undefined)
  }
  if (status !== null && status >= 500) return errorInfo("server")
  return errorInfo("server", safe ?? undefined)
}

async function readJsonEnvelope(response: Response): Promise<{
  success?: boolean
  data?: unknown
  error?: unknown
  code?: unknown
}> {
  try {
    return (await response.json()) as { success?: boolean; data?: unknown; error?: unknown; code?: unknown }
  } catch {
    return {}
  }
}

async function failFromResponse(response: Response): Promise<never> {
  const payload = await readJsonEnvelope(response)
  const info = classifyError(response.status, payload.error, payload.code)
  const requestId = response.headers.get("x-request-id")
  throw new FirmwarePatcherError(
    requestId ? { ...info, hint: `${info.hint} (Solicitud: ${requestId})` } : info,
    response.status
  )
}

async function safeFetch(input: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    throw new FirmwarePatcherError(errorInfo("network"))
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

export async function fetchCapabilities(signal?: AbortSignal): Promise<FirmwarePatcherCapabilities> {
  const response = await safeFetch(`${FIRMWARE_PATCHER_API}/capabilities`, {
    method: "GET",
    cache: "no-store",
    signal,
  })
  if (!response.ok) return failFromResponse(response)
  const payload = await readJsonEnvelope(response)
  if (payload.success === false || !payload.data) return failFromResponse(response)
  return payload.data as FirmwarePatcherCapabilities
}

export async function detectFirmware(file: File, signal?: AbortSignal): Promise<DetectResponse> {
  const body = new FormData()
  body.append("file", file, file.name)
  const response = await safeFetch(`${FIRMWARE_PATCHER_API}/detect`, {
    method: "POST",
    body,
    cache: "no-store",
    signal,
  })
  if (!response.ok) return failFromResponse(response)
  const payload = await readJsonEnvelope(response)
  if (payload.success === false || !payload.data) return failFromResponse(response)
  return payload.data as DetectResponse
}

export interface PatchRequest {
  file: File
  selection: PatchSelectionEntry[]
  allowExperimental: boolean
  fullDump: boolean
}

export async function patchFirmware(request: PatchRequest, signal?: AbortSignal): Promise<PatchResult> {
  const body = new FormData()
  body.append("file", request.file, request.file.name)
  body.append("selection", JSON.stringify(request.selection))
  body.append("allowExperimental", request.allowExperimental ? "true" : "false")
  body.append("fullDump", request.fullDump ? "true" : "false")

  const response = await safeFetch(`${FIRMWARE_PATCHER_API}/patch`, {
    method: "POST",
    body,
    cache: "no-store",
    signal,
  })
  if (!response.ok) return failFromResponse(response)
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) return failFromResponse(response)

  const blob = await response.blob()
  const model = response.headers.get("x-firmware-model")
  const { log, truncated, unavailable } = decodePatchLog(
    response.headers.get("x-firmware-patch-log"),
    response.headers.get("x-firmware-patch-log-truncated") === "1"
  )

  return {
    blob,
    filename: filenameFromDisposition(response.headers.get("content-disposition"), model),
    model,
    inputSha256: sha256OrNull(response.headers.get("x-firmware-input-sha256")),
    outputSha256: sha256OrNull(response.headers.get("x-firmware-output-sha256")),
    inputSize: intOrNull(response.headers.get("x-firmware-input-size")),
    outputSize: intOrNull(response.headers.get("x-firmware-output-size")) ?? blob.size,
    log,
    logTruncated: truncated,
    logUnavailable: unavailable,
  }
}

function sha256OrNull(value: string | null): string | null {
  return value && /^[0-9a-f]{64}$/i.test(value) ? value.toLowerCase() : null
}

function intOrNull(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  return Number.parseInt(value, 10)
}

/** Decode the `X-Firmware-Patch-Log` header (base64url JSON array, bounded to 4 KiB). */
export function decodePatchLog(
  header: string | null,
  truncatedFlag: boolean
): { log: PatchLogEntry[]; truncated: boolean; unavailable: boolean } {
  if (!header) return { log: [], truncated: truncatedFlag, unavailable: !truncatedFlag }
  try {
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (!Array.isArray(parsed)) return { log: [], truncated: truncatedFlag, unavailable: true }
    const log = parsed.filter(
      (entry): entry is PatchLogEntry => typeof entry === "object" && entry !== null && "name" in entry
    )
    return { log, truncated: truncatedFlag, unavailable: false }
  } catch {
    return { log: [], truncated: truncatedFlag, unavailable: true }
  }
}

/** Strip path separators/control chars and force a `.bin` extension. Never used as a path. */
export function safeDownloadName(name: string, fallback: string): string {
  const cleaned = name.replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, "_").trim().slice(0, 120)
  const base = cleaned && cleaned !== "." && cleaned !== ".." ? cleaned : fallback
  return /\.bin$/i.test(base) ? base : `${base}.bin`
}

export function filenameFromDisposition(header: string | null, model: string | null): string {
  const fallback = `patched_${model && /^[a-z0-9]+$/i.test(model) ? model : "firmware"}.bin`
  if (!header) return fallback
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header)
  if (star?.[1]) {
    try {
      return safeDownloadName(decodeURIComponent(star[1]), fallback)
    } catch {
      /* fall through to plain filename */
    }
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header)
  return plain?.[1] ? safeDownloadName(plain[1], fallback) : fallback
}
