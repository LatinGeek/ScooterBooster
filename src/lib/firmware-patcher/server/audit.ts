import { addAuditLogEntry } from "@/lib/db/audit-log"
import logger from "@/lib/logger"
import type { ToolRole } from "@/lib/token-extractor/api"
import type { FailureReason, RejectionReason } from "./errors"

export const FIRMWARE_AUDIT_ACTIONS = {
  applied: "firmware_patch_applied",
  rejected: "firmware_patch_rejected",
  failed: "firmware_patch_failed",
} as const

export interface AppliedAuditInput {
  uid: string
  role: ToolRole
  model: string
  family: string | null
  container: string | null
  patches: string[]
  values: Record<string, number | boolean | string>
  experimental: boolean
  fullDump: boolean
  mss0exp: boolean
  inputSha256: string
  outputSha256: string
  inputSize: number
  outputSize: number
  durationMs: number
}

/** Success audit. Throws on write failure: callers must fail closed (D5). */
export async function auditPatchApplied(input: AppliedAuditInput): Promise<void> {
  await addAuditLogEntry({
    action: FIRMWARE_AUDIT_ACTIONS.applied,
    actorUid: input.uid,
    targetType: "firmware",
    targetId: input.inputSha256,
    metadata: {
      role: input.role,
      model: input.model,
      family: input.family,
      container: input.container,
      patches: input.patches,
      values: input.values,
      experimental: input.experimental,
      fullDump: input.fullDump,
      mss0exp: input.mss0exp,
      inputSha256: input.inputSha256,
      outputSha256: input.outputSha256,
      inputSize: input.inputSize,
      outputSize: input.outputSize,
      durationMs: input.durationMs,
    },
  })
}

export interface FailureAuditInput {
  uid: string
  role: ToolRole
  outcome: "rejected" | "failed"
  reason: RejectionReason | FailureReason
  model?: string | null
  fullDump?: boolean
  experimental?: boolean
  patches?: string[]
  inputSha256?: string | null
  inputSize?: number | null
  durationMs?: number
}

/**
 * Best-effort audit for rejections/failures. A failing audit write must never replace the
 * original error returned to the caller, so errors are logged (without payload) and swallowed.
 */
export async function auditPatchNotApplied(input: FailureAuditInput): Promise<void> {
  try {
    await addAuditLogEntry({
      action: input.outcome === "rejected" ? FIRMWARE_AUDIT_ACTIONS.rejected : FIRMWARE_AUDIT_ACTIONS.failed,
      actorUid: input.uid,
      targetType: "firmware",
      targetId: input.inputSha256 ?? null,
      metadata: {
        role: input.role,
        reason: input.reason,
        model: input.model ?? null,
        fullDump: input.fullDump ?? null,
        experimental: input.experimental ?? null,
        patches: input.patches ?? [],
        inputSha256: input.inputSha256 ?? null,
        inputSize: input.inputSize ?? null,
        durationMs: input.durationMs ?? null,
      },
    })
  } catch {
    logger.error(
      { feature: "firmware-patcher", reason: input.reason, outcome: input.outcome },
      "Firmware audit write failed for non-applied operation",
    )
  }
}
