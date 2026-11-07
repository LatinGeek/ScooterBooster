import type { NextRequest } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { withErrorHandling } from "@/lib/api-response"
import { AppError, isAppError } from "@/lib/errors"
import logger from "@/lib/logger"
import { enforceRateLimit } from "@/lib/ratelimit"
import { assertTrustedOrigin } from "@/lib/security"
import { requireToolUser, type ToolRole } from "@/lib/token-extractor/api"
import { auditPatchApplied, auditPatchNotApplied } from "@/lib/firmware-patcher/server/audit"
import { assertFirmwarePatcherEnabled, FIRMWARE_LIMITS } from "@/lib/firmware-patcher/server/config"
import { withPatchSlot } from "@/lib/firmware-patcher/server/concurrency"
import { EngineFailure, type PatchOutcome } from "@/lib/firmware-patcher/server/contract"
import { firmwareEngine } from "@/lib/firmware-patcher/server/engine"
import {
  auditUnavailableError,
  FirmwareRejection,
  type FailureReason,
} from "@/lib/firmware-patcher/server/errors"
import { buildOutputFilename } from "@/lib/firmware-patcher/server/filename"
import { binaryPatchResponse } from "@/lib/firmware-patcher/server/response"
import { findModelRules, sha256Hex, withNoStore } from "@/lib/firmware-patcher/server/route-utils"
import { parseSelectionJson, validateSelection } from "@/lib/firmware-patcher/server/selection"
import { parseStrictBoolean, readFirmwareUpload } from "@/lib/firmware-patcher/server/upload"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 10

const NOT_DETECTED_MESSAGE = "No se pudo detectar el modelo del firmware."

/** Facts gathered along the way; only hashes, sizes and codes (never bytes or filenames). */
interface PatchContext {
  model: string | null
  inputSha256: string | null
  inputSize: number | null
  patches: string[]
  experimental: boolean
  fullDump: boolean
}

export const POST = withNoStore(
  withErrorHandling(async (req: NextRequest) => {
    assertFirmwarePatcherEnabled()
    assertTrustedOrigin(req)
    const user = await requireToolUser()

    await enforceRateLimit("firmwarePatch", user.uid)
    await enforceRateLimit("firmwarePatchDaily", user.uid)

    return withPatchSlot(() => runPatch(req, user))
  }),
)

async function runPatch(req: NextRequest, user: { uid: string; role: ToolRole }) {
  const startedAt = Date.now()
  const ctx: PatchContext = {
    model: null,
    inputSha256: null,
    inputSize: null,
    patches: [],
    experimental: false,
    fullDump: false,
  }

  try {
    const upload = await readFirmwareUpload(req, ["selection", "allowExperimental", "fullDump"])
    ctx.inputSize = upload.size
    ctx.inputSha256 = sha256Hex(upload.bytes)

    const allowExperimental = parseStrictBoolean(upload.fields["allowExperimental"], "allowExperimental")
    const fullDump = parseStrictBoolean(upload.fields["fullDump"], "fullDump")
    ctx.fullDump = fullDump
    const entries = parseSelectionJson(upload.fields["selection"])

    // Always re-detect on the server. A client-supplied model is not even an accepted field.
    let detection
    try {
      detection = firmwareEngine.detect(upload.bytes)
    } catch (error) {
      throw toFailure(error)
    }
    ctx.model = detection.model
    if (!detection.ok || !detection.model) {
      throw new FirmwareRejection("model_undetected", NOT_DETECTED_MESSAGE, 422)
    }

    const rules = findModelRules(firmwareEngine.capabilities().models, detection.model)
    if (!detection.supported || !rules || rules.patches.every((rule) => rule.status === "unsupported")) {
      throw new FirmwareRejection(
        "model_unsupported",
        "El modelo detectado todavía no está soportado por el parcheador.",
        422,
        detection.model,
      )
    }

    const selection = validateSelection(entries, rules, allowExperimental)
    ctx.patches = selection.patches.map((patch) => patch.code)
    ctx.experimental = selection.experimental

    let outcome: PatchOutcome
    try {
      outcome = firmwareEngine.patch(upload.bytes, detection.model, selection.patches, {
        allowExperimental,
        fullDump,
      })
    } catch (error) {
      throw toFailure(error)
    }

    if (outcome.data.byteLength === 0 || outcome.data.byteLength > FIRMWARE_LIMITS.maxOutputBytes) {
      throw new PatchFailed(
        "output_too_large",
        500,
        "El resultado del parcheo no es válido. No se generó ningún archivo.",
      )
    }

    const outputSha256 = sha256Hex(outcome.data)
    const durationMs = Date.now() - startedAt

    try {
      await auditPatchApplied({
        uid: user.uid,
        role: user.role,
        model: detection.model,
        family: detection.family,
        container: detection.container,
        patches: ctx.patches,
        values: Object.fromEntries(selection.patches.map((patch) => [patch.code, patch.value])),
        experimental: selection.experimental,
        fullDump,
        mss0exp: selection.mss0exp,
        inputSha256: ctx.inputSha256,
        outputSha256,
        inputSize: upload.size,
        outputSize: outcome.data.byteLength,
        durationMs,
      })
    } catch {
      // D5: fail closed. No audit record => no binary.
      logger.error(
        { feature: "firmware-patcher", uid: user.uid, role: user.role, model: detection.model, outcome: "audit_unavailable" },
        "Firmware audit write failed; withholding output",
      )
      throw new PatchFailed("audit_unavailable", 503, auditUnavailableError().userMessage)
    }

    logger.info(
      {
        feature: "firmware-patcher",
        uid: user.uid,
        role: user.role,
        model: detection.model,
        patchCount: ctx.patches.length,
        experimental: selection.experimental,
        fullDump,
        durationMs,
        outcome: "applied",
      },
      "Firmware patch applied",
    )

    return binaryPatchResponse({
      data: outcome.data,
      filename: buildOutputFilename(detection.model, upload.rawName),
      model: detection.model,
      inputSha256: ctx.inputSha256,
      outputSha256,
      inputSize: upload.size,
      log: outcome.log,
    })
  } catch (error) {
    await recordNonApplied(error, user, ctx, startedAt)
    if (error instanceof PatchFailed) {
      throw new AppError(`Firmware patch failed: ${error.reason}`, error.userMessage, error.status)
    }
    if (isAppError(error)) throw error
    // Unknown error: never forward the original (it could embed request data) to the shared logger.
    Sentry.captureException(new Error("Unexpected firmware patch error"), {
      tags: { feature: "firmware-patcher", stage: "patch", category: "unexpected" },
    })
    throw new AppError("Unexpected firmware patch error", "Error interno al parchear el firmware.", 500)
  }
}

/** Internal marker for failures after validation (audited as firmware_patch_failed). */
class PatchFailed extends Error {
  constructor(
    readonly reason: FailureReason,
    readonly status: number,
    readonly userMessage: string,
  ) {
    super(`Firmware patch failed: ${reason}`)
    this.name = "PatchFailed"
  }
}

function toFailure(error: unknown): PatchFailed {
  const failure = error instanceof EngineFailure ? error : new EngineFailure("engine_error", false)
  if (failure.expected) {
    return new PatchFailed(
      "engine_rejected",
      422,
      "No se pudieron aplicar los parches de forma segura a este firmware. No se generó ningún archivo.",
    )
  }
  Sentry.captureException(new Error(`Firmware engine failure: ${failure.category}`), {
    tags: { feature: "firmware-patcher", stage: "patch", category: failure.category },
  })
  return new PatchFailed("engine_error", 500, "Error interno al parchear el firmware. No se generó ningún archivo.")
}

async function recordNonApplied(
  error: unknown,
  user: { uid: string; role: ToolRole },
  ctx: PatchContext,
  startedAt: number,
): Promise<void> {
  const durationMs = Date.now() - startedAt
  const base = {
    uid: user.uid,
    role: user.role,
    model: ctx.model,
    fullDump: ctx.fullDump,
    experimental: ctx.experimental,
    patches: ctx.patches,
    inputSha256: ctx.inputSha256,
    inputSize: ctx.inputSize,
    durationMs,
  }

  if (error instanceof FirmwareRejection) {
    logger.warn(
      { feature: "firmware-patcher", uid: user.uid, role: user.role, model: ctx.model, outcome: "rejected", reason: error.reason, durationMs },
      "Firmware patch rejected",
    )
    await auditPatchNotApplied({ ...base, outcome: "rejected", reason: error.reason })
    return
  }

  if (error instanceof PatchFailed) {
    logger.warn(
      { feature: "firmware-patcher", uid: user.uid, role: user.role, model: ctx.model, outcome: "failed", reason: error.reason, durationMs },
      "Firmware patch failed",
    )
    // If the audit store itself is down there is nothing more to write.
    if (error.reason !== "audit_unavailable") {
      await auditPatchNotApplied({ ...base, outcome: "failed", reason: error.reason })
    }
    return
  }

  if (isAppError(error)) {
    // Upload/option validation errors raised as plain FirmwareRejection are handled above;
    // anything else with a status is a client error we can classify generically.
    return
  }

  logger.error(
    { feature: "firmware-patcher", uid: user.uid, role: user.role, model: ctx.model, outcome: "failed", durationMs },
    "Unexpected firmware patch error",
  )
  await auditPatchNotApplied({ ...base, outcome: "failed", reason: "engine_error" })
}
