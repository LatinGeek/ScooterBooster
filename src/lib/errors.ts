/**
 * ScooterBooster — App Error Hierarchy
 * All errors have a Spanish user-facing message and an English log message.
 */

export class AppError extends Error {
  /** HTTP status code to return from API routes */
  public readonly statusCode: number
  /** Spanish message shown to end users */
  public readonly userMessage: string

  constructor(message: string, userMessage: string, statusCode = 500) {
    super(message)
    this.name = "AppError"
    this.userMessage = userMessage
    this.statusCode = statusCode
  }
}

export class AuthError extends AppError {
  constructor(message = "Unauthenticated request") {
    super(message, "Debes iniciar sesión para continuar.", 401)
    this.name = "AuthError"
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, "No tienes permisos para realizar esta acción.", 403)
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends AppError {
  constructor(userMessage = "El recurso solicitado no existe.") {
    super("Resource not found", userMessage, 404)
    this.name = "NotFoundError"
  }
}

export class ValidationError extends AppError {
  constructor(userMessage = "Los datos enviados no son válidos.") {
    super("Validation failed", userMessage, 400)
    this.name = "ValidationError"
  }
}

export class PaymentError extends AppError {
  constructor(message = "Payment processing failed") {
    super(message, "Hubo un error al procesar el pago. Por favor, intentá de nuevo.", 402)
    this.name = "PaymentError"
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict") {
    super(message, "Ya existe un recurso con esos datos.", 409)
    this.name = "ConflictError"
  }
}

/** Narrows any thrown value to AppError for consistent handling */
export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}
