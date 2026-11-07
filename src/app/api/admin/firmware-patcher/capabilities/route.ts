import type { NextRequest } from "next/server"
import { withErrorHandling } from "@/lib/api-response"
import { requireToolUser } from "@/lib/token-extractor/api"
import { assertFirmwarePatcherEnabled, FIRMWARE_LIMITS, FIRMWARE_UPSTREAM_PIN } from "@/lib/firmware-patcher/server/config"
import { firmwareEngine } from "@/lib/firmware-patcher/server/engine"
import { jsonOk } from "@/lib/firmware-patcher/server/response"
import { selectablePatches, withNoStore } from "@/lib/firmware-patcher/server/route-utils"
import { USER_PATCH_ORDER } from "@/lib/firmware-patcher/server/selection"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 10

export const GET = withNoStore(
  withErrorHandling(async (_req: NextRequest) => {
    assertFirmwarePatcherEnabled()
    await requireToolUser()
    const capabilities = firmwareEngine.capabilities()

    return jsonOk({
      enabled: true,
      upstream: { version: FIRMWARE_UPSTREAM_PIN.version, commit: FIRMWARE_UPSTREAM_PIN.commit },
      limits: {
        maxInputBytes: FIRMWARE_LIMITS.maxInputBytes,
        maxOutputBytes: FIRMWARE_LIMITS.maxOutputBytes,
        maxPatches: FIRMWARE_LIMITS.maxUserPatches,
        maxDurationSeconds: FIRMWARE_LIMITS.maxDurationSeconds,
      },
      patchOrder: [...USER_PATCH_ORDER],
      roleAccess: { experimental: true, fullDump: true },
      models: capabilities.models.map((rules) => ({
        code: rules.model,
        displayName: rules.displayName,
        family: rules.family,
        patches: selectablePatches(rules),
      })),
    })
  }),
)
