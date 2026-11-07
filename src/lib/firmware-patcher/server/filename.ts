import { FIRMWARE_LIMITS } from "./config"

/**
 * Strips path separators, control characters and anything outside a conservative
 * ASCII set. The result is never used as a path and is safe inside a quoted
 * Content-Disposition value.
 */
export function sanitizeFirmwareFilename(raw: unknown): string {
  const base = String(raw ?? "")
    .split(/[\/]/)
    .pop()
    ?.trim()
  const clean = (base ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+/, "")
    .slice(0, FIRMWARE_LIMITS.maxFilenameLength)
  return clean || "firmware.bin"
}

export function hasBinExtension(raw: unknown): boolean {
  const base = String(raw ?? "")
    .split(/[\/]/)
    .pop()
    ?.trim()
    .toLowerCase()
  return Boolean(base && base.length > 4 && base.endsWith(".bin"))
}

/** `patched_<model>_<original-stem>.bin`, always ASCII and bounded. */
export function buildOutputFilename(model: string, originalName: unknown): string {
  const safeModel = model.replace(/[^a-z0-9]/gi, "").slice(0, 20) || "model"
  const stem =
    sanitizeFirmwareFilename(originalName)
      .replace(/\.bin$/i, "")
      .slice(0, 80)
      .replace(/^[._-]+|[._-]+$/g, "") || "firmware"
  return `patched_${safeModel}_${stem}.bin`
}
