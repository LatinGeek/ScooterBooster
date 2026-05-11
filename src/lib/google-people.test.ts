import { describe, expect, it } from "vitest"
import { normalizeGooglePhoneNumber, selectGooglePhoneNumber } from "@/lib/google-people"

describe("google people phone helpers", () => {
  it("prefers a Google mobile number that matches the app format", () => {
    expect(
      selectGooglePhoneNumber([
        { type: "home", value: "+541112223334" },
        { type: "mobile", canonicalForm: "+59899123456" },
      ])
    ).toBe("+59899123456")
  })

  it("ignores numbers outside the Uruguay format", () => {
    expect(
      selectGooglePhoneNumber([
        { type: "mobile", canonicalForm: "+541112223334" },
        { type: "work", value: "+1 212 555 0100" },
      ])
    ).toBe(null)
  })

  it("normalizes only the expected phone format", () => {
    expect(normalizeGooglePhoneNumber("+59899123456")).toBe("+59899123456")
    expect(normalizeGooglePhoneNumber("+1 212 555 0100")).toBe(null)
  })
})
