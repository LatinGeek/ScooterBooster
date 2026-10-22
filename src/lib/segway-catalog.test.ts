import { describe, expect, it } from "vitest"

import {
  buildSegwayTechnicianUpdate,
  getSegwayServicePricing,
  SEGWAY_CATALOG,
} from "@/lib/segway-catalog"
import { getPriceForBooking, isTechnicianCompatible } from "@/lib/technician-matrix"

describe("Segway Uruguay service activation", () => {
  it("preserves existing prices and enables all six confirmed combinations", () => {
    const matrix = {
      maintenance: { "xiaomi-m365": { price: 1800, currency: "UYU" as const, isAvailable: true } },
      "speed-limit": {
        "xiaomi-6-standard": { price: 3000, currency: "UYU" as const, isAvailable: true },
      },
      firmware: { "xiaomi-m365": { price: 1200, currency: "UYU" as const, isAvailable: false } },
    }
    const update = buildSegwayTechnicianUpdate(matrix, {
      "xiaomi-m365": "brand-xiaomi",
      "xiaomi-6-standard": "brand-xiaomi",
    })
    expect(matrix.maintenance).not.toHaveProperty("segway-e3-pro")
    expect(update.pricingMatrix.maintenance?.["xiaomi-m365"]).toEqual(
      matrix.maintenance["xiaomi-m365"]
    )
    expect(update.pricingMatrix["speed-limit"]?.["xiaomi-6-standard"]).toEqual(
      matrix["speed-limit"]["xiaomi-6-standard"]
    )
    expect(update.pricingMatrix.firmware).toEqual(matrix.firmware)
    for (const { model } of SEGWAY_CATALOG) {
      expect(getPriceForBooking(update.pricingMatrix, "speed-limit", model.id)).toBe(2850)
      expect(getPriceForBooking(update.pricingMatrix, "maintenance", model.id)).toBe(1800)
      expect(isTechnicianCompatible(update.pricingMatrix, "firmware", model.id)).toBe(false)
      expect(isTechnicianCompatible(update.pricingMatrix, "cruise-control", model.id)).toBe(false)
    }
    expect(update.supportedBrands).toContain("brand-segway")
    expect(update.supportedBrands).toContain("brand-xiaomi")
    expect(
      buildSegwayTechnicianUpdate(update.pricingMatrix, {
        "xiaomi-m365": "brand-xiaomi",
        "xiaomi-6-standard": "brand-xiaomi",
      })
    ).toEqual(update)
  })

  it("calculates the total without charging the reservation twice", () => {
    expect(getSegwayServicePricing("speed-limit")).toMatchObject({
      basePrice: 2850,
      serviceFee: 150,
      totalPrice: 3000,
    })
    expect(getSegwayServicePricing("maintenance")).toMatchObject({
      basePrice: 1800,
      serviceFee: 150,
      totalPrice: 1950,
    })
    expect(getSegwayServicePricing("firmware")).toBeNull()
  })
})
