import { describe, expect, it } from "vitest"
import { sanitizeOptionalPlainText, sanitizePlainText } from "@/lib/sanitize"

describe("sanitize helpers", () => {
  it("strips html tags and script content from plain text fields", () => {
    expect(sanitizePlainText("<script>alert('x')</script><b>Hola</b> mundo")).toBe("Hola mundo")
  })

  it("removes style blocks and collapses whitespace", () => {
    expect(sanitizePlainText("  <style>.x{color:red}</style>Hola\n\n  mundo  ")).toBe("Hola mundo")
  })

  it("preserves undefined optional text values", () => {
    expect(sanitizeOptionalPlainText(undefined)).toBeUndefined()
  })
})
