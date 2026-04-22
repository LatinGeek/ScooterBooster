"use client"

export const COOKIE_CONSENT_LEGACY_KEY = "sb-cookie-consent"
export const COOKIE_PREFERENCES_KEY = "sb-cookie-preferences"
export const COOKIE_PREFERENCES_EVENT = "sb-cookie-preferences-changed"

export interface CookiePreferences {
  essential: true
  analytics: boolean
  updatedAt: string
}

export type AnalyticsEventName =
  | "signup_completed"
  | "booking_started"
  | "booking_confirmed"
  | "payment_initiated"
  | "payment_succeeded"
  | "payment_failed"
  | "review_submitted"
  | "technician_applied"
  | "technician_approved"

export type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export function createCookiePreferences(
  analytics: boolean,
  updatedAt: string = new Date().toISOString(),
): CookiePreferences {
  return {
    essential: true,
    analytics,
    updatedAt,
  }
}

export function parseCookiePreferences(raw: string | null): CookiePreferences | null {
  if (!raw) return null

  if (raw === "accepted") {
    return createCookiePreferences(true)
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CookiePreferences>
    if (parsed.essential !== true || typeof parsed.analytics !== "boolean") {
      return null
    }

    return {
      essential: true,
      analytics: parsed.analytics,
      updatedAt:
        typeof parsed.updatedAt === "string" && parsed.updatedAt.length > 0
          ? parsed.updatedAt
          : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function readCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null

  const rawPreferences = window.localStorage.getItem(COOKIE_PREFERENCES_KEY)
  const parsed = parseCookiePreferences(rawPreferences)
  if (parsed) return parsed

  const legacyConsent = window.localStorage.getItem(COOKIE_CONSENT_LEGACY_KEY)
  const legacyParsed = parseCookiePreferences(legacyConsent)
  if (!legacyParsed) return null

  writeCookiePreferences(legacyParsed)
  window.localStorage.removeItem(COOKIE_CONSENT_LEGACY_KEY)
  return legacyParsed
}

export function writeCookiePreferences(preferences: CookiePreferences) {
  if (typeof window === "undefined") return

  window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences))
  window.dispatchEvent(new CustomEvent(COOKIE_PREFERENCES_EVENT, { detail: preferences }))
}

export function hasAnalyticsConsent(): boolean {
  return readCookiePreferences()?.analytics === true
}

export function trackAnalyticsEvent(
  name: AnalyticsEventName,
  params: AnalyticsEventParams = {},
): void {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return

  if (typeof window.gtag === "function") {
    window.gtag("event", name, params)
    return
  }

  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    event: name,
    ...params,
  })
}

export function trackAnalyticsEventOncePerSession(
  key: string,
  name: AnalyticsEventName,
  params: AnalyticsEventParams = {},
): void {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return

  const sessionKey = `sb-analytics:${key}`
  if (window.sessionStorage.getItem(sessionKey) === "1") return

  trackAnalyticsEvent(name, params)
  window.sessionStorage.setItem(sessionKey, "1")
}
