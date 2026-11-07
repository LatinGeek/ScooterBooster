/**
 * Firmware Patcher feature flags (SPEC G4/FP-002). Both flags must be "true".
 *
 * - `NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED` is inlined at build time and is the only flag the
 *   client layouts can read (used to hide the nav entry).
 * - `FIRMWARE_PATCHER_ENABLED` is server-only; pages (server components) check both and call
 *   `notFound()` when either is off, so a visible nav link never bypasses the server flag.
 */
export function isFirmwarePatcherNavEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED === "true"
}

/** Server-side only: both flags on. */
export function isFirmwarePatcherPageEnabled(): boolean {
  return (
    process.env.FIRMWARE_PATCHER_ENABLED === "true" &&
    process.env.NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED === "true"
  )
}
