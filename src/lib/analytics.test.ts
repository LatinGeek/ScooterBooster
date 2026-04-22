// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  COOKIE_CONSENT_LEGACY_KEY,
  COOKIE_PREFERENCES_KEY,
  createCookiePreferences,
  hasAnalyticsConsent,
  parseCookiePreferences,
  readCookiePreferences,
  trackAnalyticsEvent,
} from "@/lib/analytics"

describe("analytics helpers", () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    delete window.gtag
    window.dataLayer = []
  })

  it("parses the new cookie preferences payload", () => {
    const preferences = parseCookiePreferences(
      JSON.stringify(createCookiePreferences(true, "2026-04-22T00:00:00.000Z")),
    )

    expect(preferences).toEqual({
      essential: true,
      analytics: true,
      updatedAt: "2026-04-22T00:00:00.000Z",
    })
  })

  it("migrates the legacy accepted flag to analytics consent", () => {
    window.localStorage.setItem(COOKIE_CONSENT_LEGACY_KEY, "accepted")

    const preferences = readCookiePreferences()

    expect(preferences?.analytics).toBe(true)
    expect(window.localStorage.getItem(COOKIE_PREFERENCES_KEY)).toContain('"analytics":true')
  })

  it("only pushes analytics events when consent exists", () => {
    const gtag = vi.fn()
    window.gtag = gtag

    trackAnalyticsEvent("signup_completed", { role: "user" })
    expect(gtag).not.toHaveBeenCalled()

    window.localStorage.setItem(
      COOKIE_PREFERENCES_KEY,
      JSON.stringify(createCookiePreferences(true)),
    )

    expect(hasAnalyticsConsent()).toBe(true)
    trackAnalyticsEvent("signup_completed", { role: "user" })
    expect(gtag).toHaveBeenCalledWith("event", "signup_completed", { role: "user" })
  })
})
