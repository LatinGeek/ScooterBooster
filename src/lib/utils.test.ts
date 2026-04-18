import { describe, expect, it } from "vitest"
import { cn, formatPrice, formatWhatsAppLink } from "@/lib/utils"

describe("cn", () => {
  it("merges conditional class names", () => {
    expect(cn("px-4", false && "hidden", "py-2")).toBe("px-4 py-2")
  })

  it("lets tailwind utility conflicts resolve to the last class", () => {
    expect(cn("px-2", "px-4", "text-sm", "text-lg")).toBe("px-4 text-lg")
  })
})

describe("formatPrice", () => {
  it("formats whole UYU amounts without decimals", () => {
    expect(formatPrice(1800).replace(/\u00a0/g, " ")).toBe("$ 1.800")
  })
})

describe("formatWhatsAppLink", () => {
  it("normalizes the phone number and URL-encodes the message", () => {
    expect(formatWhatsAppLink("+598 99 111 000", "Hola técnico, ¿tenés turno?")).toBe(
      "https://wa.me/59899111000?text=Hola%20t%C3%A9cnico%2C%20%C2%BFten%C3%A9s%20turno%3F"
    )
  })
})
