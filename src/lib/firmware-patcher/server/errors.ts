import { AppError, ValidationError } from "@/lib/errors"

/** Safe, bounded reason categories stored in the audit log. */
export type RejectionReason =
  | "invalid_upload"
  | "invalid_options"
  | "invalid_selection"
  | "experimental_not_acknowledged"
  | "model_undetected"
  | "model_unsupported"
  | "file_too_large"

export type FailureReason = "engine_rejected" | "engine_error" | "output_too_large" | "audit_unavailable"

/** A client-input problem that should be audited as `firmware_patch_rejected`. */
export class FirmwareRejection extends AppError {
  readonly reason: RejectionReason
  readonly model: string | null

  constructor(reason: RejectionReason, userMessage: string, statusCode = 400, model: string | null = null) {
    super(`Firmware request rejected: ${reason}`, userMessage, statusCode)
    this.name = "FirmwareRejection"
    this.reason = reason
    this.model = model
  }
}

export function invalidUpload(userMessage: string): FirmwareRejection {
  return new FirmwareRejection("invalid_upload", userMessage, 400)
}

export function invalidSelection(userMessage: string, model: string | null = null): FirmwareRejection {
  return new FirmwareRejection("invalid_selection", userMessage, 400, model)
}

export function fileTooLarge(): FirmwareRejection {
  return new FirmwareRejection(
    "file_too_large",
    "El archivo supera el máximo de 4 MiB permitido para firmware.",
    413,
  )
}

export function auditUnavailableError(): AppError {
  return new AppError(
    "Firmware audit write failed (fail-closed)",
    "No se pudo registrar la operación en la auditoría, por lo que no se entrega el archivo. Intenta de nuevo.",
    503,
  )
}

export { ValidationError }
