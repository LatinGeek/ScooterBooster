import { afterEach, describe, expect, it } from "vitest"
import { calculatePricing } from "@/lib/mercadopago"

describe("calculatePricing", () => {
  const originalFee = process.env.SERVICE_FEE_PERCENTAGE

  afterEach(() => {
    if (originalFee === undefined) {
      delete process.env.SERVICE_FEE_PERCENTAGE
      return
    }

    process.env.SERVICE_FEE_PERCENTAGE = originalFee
  })

  it("uses the configured default service fee percentage", () => {
    process.env.SERVICE_FEE_PERCENTAGE = "10"

    expect(calculatePricing(1800)).toEqual({
      basePrice: 1800,
      serviceFee: 180,
      totalPrice: 1980,
      feePercentage: 10,
    })
  })

  it("accepts an explicit fee percentage override", () => {
    expect(calculatePricing(1500, 12)).toEqual({
      basePrice: 1500,
      serviceFee: 180,
      totalPrice: 1680,
      feePercentage: 12,
    })
  })

  it("rounds fractional service fees to the nearest peso", () => {
    expect(calculatePricing(999, 7)).toEqual({
      basePrice: 999,
      serviceFee: 70,
      totalPrice: 1069,
      feePercentage: 7,
    })
  })
})
