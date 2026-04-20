import { NextRequest } from "next/server"
import { AppError } from "./errors"

const DEV_TRUSTED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]
const CSRF_ERROR_MESSAGE = "La solicitud fue bloqueada por seguridad. Recarga la pagina e intenta de nuevo."
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"])

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null

  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function getOriginVariants(origin: string): string[] {
  const variants = new Set<string>([origin])
  const url = new URL(origin)

  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.replace(/^www\./, "")
    variants.add(url.origin)
  } else if (url.hostname.includes(".")) {
    url.hostname = `www.${url.hostname}`
    variants.add(url.origin)
  }

  return [...variants]
}

export function getTrustedOrigins(req: NextRequest): string[] {
  const trustedOrigins = new Set<string>()
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
  const requestOrigin = normalizeOrigin(req.nextUrl.origin)
  const isLoopbackRequest = LOOPBACK_HOSTS.has(req.nextUrl.hostname)

  if (configuredOrigin) {
    for (const origin of getOriginVariants(configuredOrigin)) {
      trustedOrigins.add(origin)
    }
  }

  if (requestOrigin) {
    for (const origin of getOriginVariants(requestOrigin)) {
      trustedOrigins.add(origin)
    }
  }

  if (process.env.NODE_ENV !== "production" || isLoopbackRequest) {
    for (const origin of DEV_TRUSTED_ORIGINS) {
      trustedOrigins.add(origin)
    }
  }

  return [...trustedOrigins]
}

export function assertTrustedOrigin(req: NextRequest): void {
  const origin = normalizeOrigin(req.headers.get("origin"))

  if (!origin) {
    if (LOOPBACK_HOSTS.has(req.nextUrl.hostname)) {
      return
    }

    throw new AppError("Missing Origin header", CSRF_ERROR_MESSAGE, 403)
  }

  const trustedOrigins = getTrustedOrigins(req)
  if (!trustedOrigins.includes(origin)) {
    throw new AppError(`Unexpected Origin header: ${origin}`, CSRF_ERROR_MESSAGE, 403)
  }
}
