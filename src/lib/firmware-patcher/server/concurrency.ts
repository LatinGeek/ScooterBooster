import { AppError } from "@/lib/errors"
import { FIRMWARE_LIMITS } from "./config"

declare global {
  var __sbFirmwarePatchInFlight: number | undefined
}

/** Per-instance guard so a burst of requests cannot hold many large buffers at once. */
export async function withPatchSlot<T>(task: () => Promise<T>): Promise<T> {
  const current = globalThis.__sbFirmwarePatchInFlight ?? 0
  if (current >= FIRMWARE_LIMITS.maxConcurrentPatches) {
    throw new AppError(
      "Too many concurrent firmware patch operations",
      "Hay demasiadas operaciones de parcheo en curso. Espera unos segundos e intenta de nuevo.",
      429,
    )
  }
  globalThis.__sbFirmwarePatchInFlight = current + 1
  try {
    return await task()
  } finally {
    globalThis.__sbFirmwarePatchInFlight = Math.max(0, (globalThis.__sbFirmwarePatchInFlight ?? 1) - 1)
  }
}
