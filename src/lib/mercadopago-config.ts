export type MercadoPagoEnvironment = "test" | "live"

const DEFAULT_ENVIRONMENT: MercadoPagoEnvironment =
  process.env.NODE_ENV === "production" ? "live" : "test"

function normalizeEnvironment(value: string | undefined | null): MercadoPagoEnvironment | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (normalized === "test" || normalized === "live") return normalized
  return null
}

export function getMercadoPagoEnvironment(): MercadoPagoEnvironment {
  return normalizeEnvironment(process.env.MERCADOPAGO_ENVIRONMENT) ?? DEFAULT_ENVIRONMENT
}

export function getMercadoPagoEnvironmentCandidates(): MercadoPagoEnvironment[] {
  const selected = getMercadoPagoEnvironment()
  return selected === "test" ? ["test", "live"] : ["live"]
}

export function getMercadoPagoAccessToken(environment: MercadoPagoEnvironment): string {
  const legacyAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()

  if (environment === "test") {
    return (
      process.env.MERCADOPAGO_TEST_ACCESS_TOKEN?.trim() ||
      legacyAccessToken ||
      ""
    )
  }

  return process.env.MERCADOPAGO_LIVE_ACCESS_TOKEN?.trim() || ""
}

export function getMercadoPagoPublicKey(environment: MercadoPagoEnvironment): string | null {
  if (environment === "test") {
    return (
      process.env.NEXT_PUBLIC_MERCADOPAGO_TEST_PUBLIC_KEY?.trim() ||
      process.env.MERCADOPAGO_TEST_PUBLIC_KEY?.trim() ||
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim() ||
      process.env.MERCADOPAGO_PUBLIC_KEY?.trim() ||
      null
    )
  }

  return (
    process.env.NEXT_PUBLIC_MERCADOPAGO_LIVE_PUBLIC_KEY?.trim() ||
    process.env.MERCADOPAGO_LIVE_PUBLIC_KEY?.trim() ||
    null
  )
}

export function getMercadoPagoWebhookSecrets(): string[] {
  return [
    process.env.MERCADOPAGO_WEBHOOK_SECRET_TEST?.trim(),
    process.env.MERCADOPAGO_WEBHOOK_SECRET_LIVE?.trim(),
    process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim(),
  ].filter((value): value is string => Boolean(value))
}

export function getMercadoPagoSelectedAccessToken(): string {
  return getMercadoPagoAccessToken(getMercadoPagoEnvironment())
}

export function hasMercadoPagoSelectedAccessToken(): boolean {
  return Boolean(getMercadoPagoSelectedAccessToken())
}
