import { describe, expect, it } from "vitest"
import {
  createTechnicianSchema,
  updateTechnicianPricingSchema,
} from "@/lib/validators/technician"

describe("createTechnicianSchema", () => {
  it("accepts a valid technician onboarding payload", () => {
    expect(
      createTechnicianSchema.safeParse({
        displayName: "Carlos Rodríguez",
        bio: "Técnico especializado en scooters Xiaomi y Segway con amplia experiencia.",
        phone: "+59899111001",
        whatsappNumber: "+59899111001",
        location: "Montevideo Centro",
        services: ["speed-limit"],
        supportedBrands: ["brand-xiaomi"],
        availability: {
          monday: { start: "09:00", end: "18:00" },
        },
      }).success
    ).toBe(true)
  })

  it("rejects technician payloads without supported brands", () => {
    const parsed = createTechnicianSchema.safeParse({
      displayName: "Carlos Rodríguez",
      bio: "Técnico especializado en scooters Xiaomi y Segway con amplia experiencia.",
      phone: "+59899111001",
      whatsappNumber: "+59899111001",
      location: "Montevideo Centro",
      services: ["speed-limit"],
      supportedBrands: [],
    })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toContain("marca")
  })
})

describe("updateTechnicianPricingSchema", () => {
  it("accepts positive UYU pricing maps", () => {
    expect(
      updateTechnicianPricingSchema.safeParse({
        pricing: {
          firmware: { basePrice: 1200, currency: "UYU" },
        },
      }).success
    ).toBe(true)
  })

  it("rejects zero or negative prices", () => {
    expect(
      updateTechnicianPricingSchema.safeParse({
        pricing: {
          firmware: { basePrice: 0, currency: "UYU" },
        },
      }).success
    ).toBe(false)
  })
})
