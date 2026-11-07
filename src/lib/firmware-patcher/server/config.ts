import { NotFoundError } from "@/lib/errors"

/** Hard limits (SPEC FP-003 / FP-011). */
export const FIRMWARE_LIMITS = {
  maxInputBytes: 4 * 1024 * 1024,
  maxOutputBytes: 8 * 1024 * 1024,
  maxUserPatches: 8,
  /** Multipart envelope allowance on top of the file when checking Content-Length. */
  multipartOverheadBytes: 64 * 1024,
  maxFilenameLength: 120,
  maxPatchLogHeaderBytes: 4096,
  maxDurationSeconds: 10,
  /** Per-instance cap on concurrent patch operations. */
  maxConcurrentPatches: 4,
} as const

export const FIRMWARE_UPSTREAM_PIN = {
  repository: "https://github.com/scooterteam/bw-patcher",
  version: "1.1.6",
  commit: "95a8f339787a1fb6486554d61b573b8e2b688c53",
} as const

/** Both flags must be exactly "true" (SPEC G4 / FP-002). Evaluated per request, never cached. */
export function isFirmwarePatcherEnabled(): boolean {
  return (
    process.env.FIRMWARE_PATCHER_ENABLED === "true" &&
    process.env.NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED === "true"
  )
}

/** Throws a 404 when the feature is off so the API looks like it does not exist. */
export function assertFirmwarePatcherEnabled(): void {
  if (!isFirmwarePatcherEnabled()) {
    throw new NotFoundError("No encontrado.")
  }
}

export const NO_STORE_HEADERS = { "cache-control": "no-store" } as const
