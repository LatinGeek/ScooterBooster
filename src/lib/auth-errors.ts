const FALLBACK_LOGIN_ERROR = "No se pudo iniciar sesión. Intentá de nuevo."

export type AuthFlowStage = "popup" | "profile_sync" | "session_sync"

export class AuthFlowError extends Error {
  public readonly code: string
  public readonly stage: AuthFlowStage

  constructor(code: string, stage: AuthFlowStage, message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined)
    this.name = "AuthFlowError"
    this.code = code
    this.stage = stage
  }
}

function getErrorCode(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null
  const code = (err as { code?: unknown }).code
  return typeof code === "string" && code.trim() ? code : null
}

function getErrorMessage(err: unknown): string | null {
  if (typeof err !== "object" || err === null) return null
  const message = (err as { message?: unknown }).message
  return typeof message === "string" && message.trim() ? message : null
}

export function getLoginErrorMessage(err: unknown): string {
  if (err instanceof AuthFlowError) {
    switch (err.code) {
      case "auth/profile-sync-failed":
        return "Iniciaste sesión con Google, pero no pudimos crear tu perfil. Recargá e intentá de nuevo."
      case "auth/session-sync-failed":
        return "Iniciaste sesión con Google, pero no pudimos sincronizar tu sesión. Recargá e intentá de nuevo."
      default:
        break
    }
  }

  const code = getErrorCode(err)
  switch (code) {
    case "auth/popup-closed-by-user":
      return "Cerraste la ventana de Google antes de terminar el inicio de sesión."
    case "auth/popup-blocked":
      return "Tu navegador bloqueó la ventana de Google. Permití ventanas emergentes e intentá de nuevo."
    case "auth/cancelled-popup-request":
      return "Se canceló el intento de inicio de sesión. Probá de nuevo."
    case "auth/unauthorized-domain":
      return "Este dominio no está autorizado para iniciar sesión con Google."
    case "auth/account-exists-with-different-credential":
      return "Ya existe una cuenta con ese correo usando otro método de acceso."
    case "auth/network-request-failed":
      return "No pudimos conectar con Google o Firebase. Revisá tu conexión e intentá de nuevo."
    case "auth/operation-not-allowed":
      return "El inicio de sesión con Google no está habilitado en este momento."
    default:
      break
  }

  const message = getErrorMessage(err)
  if (message) {
    if (/permission-denied/i.test(message)) {
      return "No pudimos crear tu cuenta en ScooterBooster. Recargá e intentá de nuevo."
    }
    if (/origin/i.test(message) || /csrf/i.test(message)) {
      return "La sesión fue bloqueada por seguridad. Recargá la página e intentá de nuevo."
    }
  }

  return FALLBACK_LOGIN_ERROR
}
