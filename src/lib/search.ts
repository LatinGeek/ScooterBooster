import { getActiveBrands } from "@/lib/db/brands"
import { getActiveModels } from "@/lib/db/models"
import { getActiveServices } from "@/lib/db/services"
import { getActiveTechnicians } from "@/lib/db/technicians"
import type { ScooterModel, Service, Technician } from "@/types"

export interface TechnicianSearchFilters {
  query?: string
  serviceIds?: string[]
  brandId?: string
  location?: string
  minRating?: number
  minPrice?: number
  maxPrice?: number
}

export interface PlatformSearchResults {
  scooters: ScooterModel[]
  services: Service[]
  technicians: Technician[]
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

export function tokenizeSearchText(value: string): string[] {
  return [...new Set(normalizeSearchText(value).split(" ").filter(Boolean))]
}

function matchesSearch(values: Array<string | null | undefined>, query: string): boolean {
  const tokens = tokenizeSearchText(query)
  if (tokens.length === 0) return true

  const haystack = normalizeSearchText(values.filter(Boolean).join(" "))
  if (!haystack) return false

  return tokens.every((token) => haystack.includes(token))
}

function getRelevantPrices(technician: Technician, serviceIds: string[]): number[] {
  const scopedServiceIds = serviceIds.length > 0 ? serviceIds : Object.keys(technician.pricing)
  return scopedServiceIds
    .map((serviceId) => technician.pricing[serviceId]?.basePrice)
    .filter((price): price is number => typeof price === "number")
}

export async function searchTechnicians(
  filters: TechnicianSearchFilters = {}
): Promise<Technician[]> {
  const technicians = await getActiveTechnicians({ sortBy: "rating" })
  const selectedServices = filters.serviceIds?.filter(Boolean) ?? []
  const normalizedQuery = filters.query?.trim() ?? ""
  const normalizedLocation = filters.location?.trim() ?? ""

  return technicians
    .filter((technician) => {
      if (selectedServices.length > 0) {
        const offersSelectedService = selectedServices.some((serviceId) =>
          technician.services.includes(serviceId)
        )
        if (!offersSelectedService) return false
      }

      if (filters.brandId && !technician.supportedBrands.includes(filters.brandId)) {
        return false
      }

      if (
        normalizedQuery &&
        !matchesSearch(
          [technician.displayName, technician.bio, technician.location],
          normalizedQuery
        )
      ) {
        return false
      }

      if (normalizedLocation && !matchesSearch([technician.location], normalizedLocation)) {
        return false
      }

      if (filters.minRating !== undefined && technician.rating < filters.minRating) {
        return false
      }

      if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
        const prices = getRelevantPrices(technician, selectedServices)
        if (prices.length === 0) return false

        const matchesPrice = prices.some((price) => {
          if (filters.minPrice !== undefined && price < filters.minPrice) return false
          if (filters.maxPrice !== undefined && price > filters.maxPrice) return false
          return true
        })

        if (!matchesPrice) return false
      }

      return true
    })
    .sort((left, right) => {
      if (right.rating !== left.rating) return right.rating - left.rating
      if (right.reviewCount !== left.reviewCount) return right.reviewCount - left.reviewCount

      const leftMinPrice = Math.min(...getRelevantPrices(left, selectedServices))
      const rightMinPrice = Math.min(...getRelevantPrices(right, selectedServices))
      return leftMinPrice - rightMinPrice
    })
}

export async function searchPlatform(query: string, limit = 6): Promise<PlatformSearchResults> {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.length < 2) {
    return { scooters: [], services: [], technicians: [] }
  }

  const [brands, models, services, technicians] = await Promise.all([
    getActiveBrands(),
    getActiveModels(),
    getActiveServices(),
    getActiveTechnicians({ sortBy: "rating" }),
  ])

  const brandById = new Map(brands.map((brand) => [brand.id, brand]))
  const serviceById = new Map(services.map((service) => [service.id, service]))

  const scooters = models
    .filter((model) =>
      matchesSearch(
        [
          model.name,
          model.slug,
          brandById.get(model.brandId)?.name,
          brandById.get(model.brandId)?.slug,
        ],
        normalizedQuery
      )
    )
    .slice(0, limit)

  const matchedServices = services
    .filter((service) =>
      matchesSearch(
        [service.name, service.description, service.category, service.slug],
        normalizedQuery
      )
    )
    .slice(0, limit)

  const matchedTechnicians = technicians
    .filter((technician) =>
      matchesSearch(
        [
          technician.displayName,
          technician.bio,
          technician.location,
          ...technician.services.map((serviceId) => serviceById.get(serviceId)?.name ?? serviceId),
          ...technician.supportedBrands.map((brandId) => brandById.get(brandId)?.name ?? brandId),
        ],
        normalizedQuery
      )
    )
    .slice(0, limit)

  return {
    scooters,
    services: matchedServices,
    technicians: matchedTechnicians,
  }
}
