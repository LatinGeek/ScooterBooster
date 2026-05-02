import { getCoordinatesForLocation, haversineDistanceKm } from "@/lib/uruguay-locations"
import type { Technician } from "@/types"

export function getTechnicianCoordinates(
  technician: Technician
): { lat: number; lng: number } | null {
  return technician.coordinates ?? getCoordinatesForLocation(technician.location)
}

export function getDistanceToTechnician(
  technician: Technician,
  latitude?: number,
  longitude?: number
): number | null {
  if (latitude === undefined || longitude === undefined) return null

  const coordinates = getTechnicianCoordinates(technician)
  if (!coordinates) return null

  return haversineDistanceKm(latitude, longitude, coordinates.lat, coordinates.lng)
}
