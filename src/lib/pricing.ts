export const DEFAULT_SERVICE_FEE_AMOUNT = 100

export function calculatePricing(
  basePrice: number,
  serviceFeeAmount: number = DEFAULT_SERVICE_FEE_AMOUNT
) {
  const serviceFee = Math.max(0, Math.round(serviceFeeAmount))
  const totalPrice = basePrice + serviceFee

  return { basePrice, serviceFee, totalPrice, feeAmount: serviceFee }
}
