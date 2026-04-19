import { NextRequest } from "next/server"
import { AppError } from "./errors"

const DEV_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
const CSRF_ERROR_MESSAGE = "La solicitud fue bloqueada por seguridad. Recarga la pagina e intenta de nuevo."

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function getTrustedOrigins(req: NextRequest): string[] {
  const trustedOrigins = new Set<string>()
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)

  if (configuredOrigin) {
    trustedOrigins.add(configuredOrigin)
  }

  if (process.env.NODE_ENV !== "production") {
    trustedOrigins.add(req.nextUrl.origin)

    for (const origin of DEV_TRUSTED_ORIGINS) {
      trustedOrigins.add(origin)
    }
  }

  return [...trustedOrigins]
}

export function assertTrustedOrigin(req: NextRequest): void {
  const origin = normalizeOrigin(req.headers.get("origin"))

  if (!origin) {
    throw new AppError("Missing Origin header", CSRF_ERROR_MESSAGE, 403)
  }

  const trustedOrigins = getTrustedOrigins(req)
  if (!trustedOrigins.includes(origin)) {
    throw new AppError(`Unexpected Origin header: ${origin}`, CSRF_ERROR_MESSAGE, 403)
  }
}
