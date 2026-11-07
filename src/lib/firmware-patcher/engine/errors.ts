import type { FirmwarePatchErrorCode } from "../types"

/**
 * Typed engine error. `message` is a short English diagnostic WITHOUT firmware bytes;
 * `detail` may carry small hex snippets for debugging and must never be logged or audited.
 */
export class FirmwarePatchError extends Error {
  readonly code: FirmwarePatchErrorCode
  readonly patch?: string
  readonly detail?: string

  constructor(
    code: FirmwarePatchErrorCode,
    message: string,
    options: { patch?: string; detail?: string; cause?: unknown } = {}
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = "FirmwarePatchError"
    this.code = code
    this.patch = options.patch
    this.detail = options.detail
  }
}

/** Upstream `SignatureException("Pattern not found!")`. */
export class SignatureNotFoundError extends FirmwarePatchError {
  constructor(message = "Pattern not found!", options: { patch?: string; detail?: string } = {}) {
    super("signature_not_found", message, options)
    this.name = "SignatureNotFoundError"
  }
}

/** Raised by the Thumb encoder when an instruction cannot be encoded exactly like keystone. */
export class AssemblerError extends FirmwarePatchError {
  constructor(message: string, detail?: string) {
    super("encoding_failed", message, { detail })
    this.name = "AssemblerError"
  }
}

/** Upstream behaviour is to emit a form this encoder intentionally does not implement. */
export class UnsupportedEncodingError extends AssemblerError {
  constructor(message: string, detail?: string) {
    super(message, detail)
    this.name = "UnsupportedEncodingError"
  }
}

/** Python `IndexError` equivalent (out-of-range byte access). */
export class PyIndexError extends FirmwarePatchError {
  constructor(message = "index out of range") {
    super("patch_failed", message)
    this.name = "PyIndexError"
  }
}
