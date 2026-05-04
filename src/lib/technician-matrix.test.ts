import { describe, expect, it } from "vitest"
import {
  deriveLegacyFieldsFromMatrix,
  derivePricingFromMatrix,
  deriveServicesFromMatrix,
  getPriceForBooking,
  getTechnicianBookingPrice,
  isTechnicianCompatible,
  isTechnicianCompatibleForBooking,
} from "@/lib/technician-matrix"

describe("technician-matrix", () => {
  const matrix = {
    "speed-limit": {
      "xiaomi-mi5-gen3": { price: 1500, currency: "UYU" as const, isAvailable: true },
      "ninebot-g2": { price: 2200, currency: "UYU" as const, isAvailable: true },
      "vsett-9": { price: 0, currency: "UYU" as const, isAvailable: false },
    },
    maintenance: {
      "xiaomi-mi5-gen3": { price: 500, currency: "UYU" as const, isAvailable: true },
    },
  }

  it("derives legacy summary fields from the matrix", () => {
    expect(deriveServicesFromMatrix(matrix)).toEqual(["speed-limit", "maintenance"])
    expect(derivePricingFromMatrix(matrix)).toEqual({
      "speed-limit": { basePrice: 1500, currency: "UYU" },
      maintenance: { basePrice: 500, currency: "UYU" },
    })
    expect(
      deriveLegacyFieldsFromMatrix(matrix, {
        "xiaomi-mi5-gen3": "xiaomi",
        "ninebot-g2": "ninebot",
      })
    ).toEqual({
      services: ["speed-limit", "maintenance"],
      supportedBrands: ["xiaomi", "ninebot"],
      pricing: {
        "speed-limit": { basePrice: 1500, currency: "UYU" },
        maintenance: { basePrice: 500, currency: "UYU" },
      },
    })
  })

  it("resolves booking prices from the exact service x model pair", () => {
    expect(getPriceForBooking(matrix, "speed-limit", "xiaomi-mi5-gen3")).toBe(1500)
    expect(getPriceForBooking(matrix, "speed-limit", "vsett-9")).toBeNull()
    expect(isTechnicianCompatible(matrix, "speed-limit", "xiaomi-mi5-gen3")).toBe(true)
    expect(isTechnicianCompatible(matrix, "speed-limit", "vsett-9")).toBe(false)
  })

  it("falls back to legacy summary pricing when the matrix is absent", () => {
    expect(
      getTechnicianBookingPrice(
        {
          pricingMatrix: undefined,
          pricing: { maintenance: { basePrice: 800, currency: "UYU" } },
        },
        "maintenance",
        "xiaomi-mi5-gen3"
      )
    ).toBe(800)

    expect(
      isTechnicianCompatibleForBooking(
        {
          pricingMatrix: undefined,
          services: ["maintenance"],
          supportedBrands: ["xiaomi"],
        },
        "maintenance",
        "xiaomi-mi5-gen3",
        "xiaomi"
      )
    ).toBe(true)
  })
})
