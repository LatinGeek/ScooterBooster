import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { withErrorHandling } from "@/lib/api-response"
import { AppError } from "@/lib/errors"
import logger from "@/lib/logger"
import { assertTrustedOrigin } from "@/lib/security"
import { requireToolUser } from "@/lib/token-extractor/api"
import { assertFirmwarePatcherEnabled } from "@/lib/firmware-patcher/server/config"
import { EngineFailure } from "@/lib/firmware-patcher/server/contract"
import { firmwareEngine } from "@/lib/firmware-patcher/server/engine"
import { jsonOk } from "@/lib/firmware-patcher/server/response"
import { findModelRules, selectablePatches, sha256Hex, withNoStore } from "@/lib/firmware-patcher/server/route-utils"
import { readFirmwareUpload } from "@/lib/firmware-patcher/server/upload"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 10

const NOT_DETECTED_MESSAGE = "No se pudo detectar el modelo del firmware."

export const POST = withNoStore(
  withErrorHandling(async (req: NextRequest) => {
    assertFirmwarePatcherEnabled()
    assertTrustedOrigin(req)
    const user = await requireToolUser()
    const startedAt = Date.now()

    const upload = await readFirmwareUpload(req, [])

    let detection
    try {
      detection = firmwareEngine.detect(upload.bytes)
    } catch (error) {
      const failure = error instanceof EngineFailure ? error : new EngineFailure("engine_error", false)
      if (!failure.expected) {
        Sentry.captureException(new Error(`Firmware detection failure: ${failure.category}`), {
          tags: { feature: "firmware-patcher", stage: "detect", category: failure.category },
        })
      }
      logger.warn(
        { feature: "firmware-patcher", uid: user.uid, role: user.role, outcome: "detect_failed", category: failure.category },
        "Firmware detection failed",
      )
      throw new AppError(
        `Firmware detection failed: ${failure.category}`,
        failure.expected ? NOT_DETECTED_MESSAGE : "No se pudo analizar el firmware.",
        failure.expected ? 422 : 500,
      )
    }

    const rules = findModelRules(firmwareEngine.capabilities().models, detection.model)
    const patches = rules ? selectablePatches(rules) : []
    const supported = detection.ok && detection.supported && rules !== null && patches.length > 0

    let message: string | null = null
    if (!detection.ok || !detection.model) {
      message = NOT_DETECTED_MESSAGE
    } else if (!supported) {
      message = "El modelo detectado todavía no está soportado por el parcheador."
    }

    logger.info(
      {
        feature: "firmware-patcher",
        uid: user.uid,
        role: user.role,
        model: detection.model,
        supported,
        outcome: "detected",
        durationMs: Date.now() - startedAt,
      },
      "Firmware detection completed",
    )

    return jsonOk({
      detection,
      supported,
      message,
      availablePatches: supported ? patches : [],
      inputSha256: sha256Hex(upload.bytes),
      size: upload.size,
    })
  }),
)
