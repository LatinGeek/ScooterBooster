/**
 * Firmware Patcher â€” server-only public surface.
 *
 * This module (and everything under `engine/`) must only be imported from server code:
 * route handlers, server actions, or scripts. It has no React/client dependency and no client directive. `types.ts` is the client-safe subset.
 */

export * from "./types"
export { detectBytes, detectFirmware } from "./detect"
export {
  CAPABILITIES_UPSTREAM,
  CAPABILITY_MATRIX,
  HIDDEN_UPSTREAM_PATCHES,
  REAL_FIXTURE_SHA256,
  SHIPPED_MODELS,
  getAvailablePatchCodes,
  getModelCapability,
  getModelDisplayName,
  getPatchCapability,
  isModelShipped,
} from "./capabilities"
export { bitReverse8, bitReverse16, crc16Ccitt, crc16N32, crc32Lks32 } from "./crc"
export { applyFirmwarePatches, normalizeSelection } from "./engine/pipeline"
export { FirmwarePatchError, SignatureNotFoundError } from "./engine/errors"
export { MODEL_PATCHERS, createPatcher } from "./engine/registry"
export { MSS0_BODY_OFFSETS, applyMss0ToBody } from "./engine/mss0"
export type { PatchOp } from "./engine/core"
