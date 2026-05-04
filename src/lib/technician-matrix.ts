import type { ServicePricing, Technician, TechnicianModelPricing } from "@/types"

export function hasTechnicianMatrix(matrix?: Technician["pricingMatrix"] | null): matrix is NonNullable<
  Technician["pricingMatrix"]
> {
  return Boolean(matrix && Object.keys(matrix).length > 0)
}

export function deriveServicesFromMatrix(matrix: Technician["pricingMatrix"]): string[] {
  if (!matrix) return []

  return Object.entries(matrix)
    .filter(([, models]) => Object.values(models).some((model) => model.isAvailable))
    .map(([serviceId]) => serviceId)
}

export function deriveSupportedBrandsFromMatrix(
  matrix: Technician["pricingMatrix"],
  modelBrandMap: Record<string, string>
): string[] {
  if (!matrix) return []

  const brandSet = new Set<string>()
  for (const models of Object.values(matrix)) {
    for (const [modelId, entry] of Object.entries(models)) {
      if (entry.isAvailable && modelBrandMap[modelId]) {
        brandSet.add(modelBrandMap[modelId])
      }
    }
  }

  return Array.from(brandSet)
}

export function derivePricingFromMatrix(
  matrix: Technician["pricingMatrix"]
): Record<string, ServicePricing> {
  const result: Record<string, ServicePricing> = {}
  if (!matrix) return result

  for (const [serviceId, models] of Object.entries(matrix)) {
    const prices = Object.values(models)
      .filter((model) => model.isAvailable && model.price >= 0)
      .map((model) => model.price)

    if (prices.length > 0) {
      result[serviceId] = { basePrice: Math.min(...prices), currency: "UYU" }
    }
  }

  return result
}

export function getPriceForBooking(
  matrix: Technician["pricingMatrix"],
  serviceId: string,
  modelId: string
): number | null {
  const entry = matrix?.[serviceId]?.[modelId]
  if (!entry?.isAvailable) return null
  return typeof entry.price === "number" && Number.isFinite(entry.price) ? entry.price : null
}

export function isTechnicianCompatible(
  matrix: Technician["pricingMatrix"],
  serviceId: string,
  modelId: string
): boolean {
  return matrix?.[serviceId]?.[modelId]?.isAvailable === true
}

export function getTechnicianBookingPrice(
  technician: Pick<Technician, "pricingMatrix" | "pricing">,
  serviceId: string,
  modelId: string
): number | null {
  if (hasTechnicianMatrix(technician.pricingMatrix)) {
    return getPriceForBooking(technician.pricingMatrix, serviceId, modelId)
  }

  const pricing = technician.pricing[serviceId]
  return typeof pricing?.basePrice === "number" && Number.isFinite(pricing.basePrice)
    ? pricing.basePrice
    : null
}

export function getTechnicianStartingPrice(
  technician: Pick<Technician, "pricingMatrix" | "pricing">,
  serviceId?: string,
  modelId?: string
): number | null {
  if (serviceId && modelId) {
    return getTechnicianBookingPrice(technician, serviceId, modelId)
  }

  if (hasTechnicianMatrix(technician.pricingMatrix)) {
    if (serviceId) {
      const prices = Object.values(technician.pricingMatrix[serviceId] ?? {})
        .filter((entry) => entry.isAvailable && entry.price >= 0)
        .map((entry) => entry.price)
      return prices.length > 0 ? Math.min(...prices) : null
    }

    const allPrices = Object.values(technician.pricingMatrix)
      .flatMap((models) => Object.values(models))
      .filter((entry) => entry.isAvailable && entry.price >= 0)
      .map((entry) => entry.price)
    return allPrices.length > 0 ? Math.min(...allPrices) : null
  }

  if (serviceId) {
    const pricing = technician.pricing[serviceId]
    return typeof pricing?.basePrice === "number" && Number.isFinite(pricing.basePrice)
      ? pricing.basePrice
      : null
  }

  const prices = Object.values(technician.pricing)
    .map((entry) => entry.basePrice)
    .filter((price) => typeof price === "number" && Number.isFinite(price))

  return prices.length > 0 ? Math.min(...prices) : null
}

export function isTechnicianCompatibleForBooking(
  technician: Pick<Technician, "pricingMatrix" | "services" | "supportedBrands">,
  serviceId: string,
  modelId: string,
  modelBrandId?: string
): boolean {
  if (hasTechnicianMatrix(technician.pricingMatrix)) {
    return isTechnicianCompatible(technician.pricingMatrix, serviceId, modelId)
  }

  if (!modelBrandId) return false
  return technician.services.includes(serviceId) && technician.supportedBrands.includes(modelBrandId)
}

export function deriveLegacyFieldsFromMatrix(
  matrix: Technician["pricingMatrix"],
  modelBrandMap: Record<string, string>
): {
  services: string[]
  supportedBrands: string[]
  pricing: Record<string, ServicePricing>
} {
  return {
    services: deriveServicesFromMatrix(matrix),
    supportedBrands: deriveSupportedBrandsFromMatrix(matrix, modelBrandMap),
    pricing: derivePricingFromMatrix(matrix),
  }
}

export function normalizeMatrixInput(
  matrix: Record<string, Record<string, TechnicianModelPricing>> | undefined | null
): Record<string, Record<string, TechnicianModelPricing>> {
  if (!matrix) return {}

  const normalized: Record<string, Record<string, TechnicianModelPricing>> = {}
  for (const [serviceId, models] of Object.entries(matrix)) {
    normalized[serviceId] = {}
    for (const [modelId, entry] of Object.entries(models ?? {})) {
      const price = typeof entry?.price === "number" && Number.isFinite(entry.price) ? entry.price : 0
      normalized[serviceId][modelId] = {
        price: Math.max(0, price),
        currency: "UYU",
        isAvailable: entry?.isAvailable === true,
      }
    }
  }

  return normalized
}
