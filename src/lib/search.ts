import { getActiveBrands } from "@/lib/db/brands"
import { getActiveModels } from "@/lib/db/models"
import { getActiveServices } from "@/lib/db/services"
import { getActiveTechnicians } from "@/lib/db/technicians"
import { getDistanceToTechnician } from "@/lib/technician-location"
import {
  matchUruguayLocation,
  type UruguayLocationPreset,
} from "@/lib/uruguay-locations"
import type { ScooterModel, Service, Technician } from "@/types"

export { getDistanceToTechnician } from "@/lib/technician-location"

export interface TechnicianSearchFilters {
  query?: string
  serviceIds?: string[]
  brandId?: string
  location?: string
  minRating?: number
  minPrice?: number
  maxPrice?: number
  latitude?: number
  longitude?: number
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

function matchesIndexedTokens(searchTokens: string[] | undefined, query: string): boolean | null {
  const indexedTokens = searchTokens?.filter(Boolean) ?? []
  if (indexedTokens.length === 0) return null

  const tokens = tokenizeSearchText(query)
  if (tokens.length === 0) return true

  return tokens.every((token) => indexedTokens.some((searchToken) => searchToken.includes(token)))
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

export function getTechnicianLocationPreset(technician: Technician): UruguayLocationPreset | null {
  return matchUruguayLocation(technician.location)
}

export async function searchTechnicians(
  filters: TechnicianSearchFilters = {}
): Promise<Technician[]> {
  const technicians = await getActiveTechnicians({ sortBy: "rating" })
  const selectedServices = filters.serviceIds?.filter(Boolean) ?? []
  const normalizedQuery = filters.query?.trim() ?? ""
  const normalizedLocation = filters.location ? normalizeSearchText(filters.location) : ""
  const hasCoordinates = filters.latitude !== undefined && filters.longitude !== undefined

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
        !(
          matchesIndexedTokens(technician.searchTokens, normalizedQuery) ??
          matchesSearch(
            [technician.displayName, technician.bio, technician.location],
            normalizedQuery
          )
        )
      ) {
        return false
      }

      if (
        normalizedLocation &&
        !(
          technician.normalizedLocation?.includes(normalizedLocation) ??
          matchesSearch([technician.location], normalizedLocation)
        )
      ) {
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
      if (hasCoordinates) {
        const leftDistance = getDistanceToTechnician(left, filters.latitude, filters.longitude)
        const rightDistance = getDistanceToTechnician(right, filters.latitude, filters.longitude)

        if (leftDistance !== null && rightDistance !== null && leftDistance !== rightDistance) {
          return leftDistance - rightDistance
        }
        if (leftDistance !== null && rightDistance === null) return -1
        if (leftDistance === null && rightDistance !== null) return 1
      }

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
    .filter(
      (model) =>
        matchesIndexedTokens(model.searchTokens, normalizedQuery) ??
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
    .filter(
      (service) =>
        matchesIndexedTokens(service.searchTokens, normalizedQuery) ??
        matchesSearch(
          [service.name, service.description, service.category, service.slug],
          normalizedQuery
        )
    )
    .slice(0, limit)

  const matchedTechnicians = technicians
    .filter(
      (technician) =>
        matchesIndexedTokens(technician.searchTokens, normalizedQuery) ??
        matchesSearch(
          [
            technician.displayName,
            technician.bio,
            technician.location,
            ...technician.services.map(
              (serviceId) => serviceById.get(serviceId)?.name ?? serviceId
            ),
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
