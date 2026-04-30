import { describe, expect, it } from "vitest"
import { calculatePricing } from "@/lib/mercadopago"

describe("calculatePricing", () => {
  it("uses the fixed default service fee amount", () => {
    expect(calculatePricing(1800)).toEqual({
      basePrice: 1800,
      serviceFee: 100,
      totalPrice: 1900,
      feeAmount: 100,
    })
  })

  it("accepts an explicit fixed fee override", () => {
    expect(calculatePricing(1500, 250)).toEqual({
      basePrice: 1500,
      serviceFee: 250,
      totalPrice: 1750,
      feeAmount: 250,
    })
  })

  it("rounds fractional fee overrides to the nearest peso", () => {
    expect(calculatePricing(999, 99.6)).toEqual({
      basePrice: 999,
      serviceFee: 100,
      totalPrice: 1099,
      feeAmount: 100,
    })
  })
})
