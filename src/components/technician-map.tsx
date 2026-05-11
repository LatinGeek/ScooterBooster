"use client"

import { useEffect, useMemo } from "react"
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet"
import L from "leaflet"
import { Button } from "@/components/ui/button"
import { getCoordinatesForLocation } from "@/lib/uruguay-locations"
import type { Technician } from "@/types"

interface TechnicianMapItem extends Technician {
  distanceKm?: number | null
}

interface TechnicianMapProps {
  technicians: TechnicianMapItem[]
  selectedId: string | null
  userLocation?: { lat: number; lng: number } | null
  onClearSelection?: () => void
  onSelect: (id: string) => void
}

const MONTEVIDEO_CENTER: [number, number] = [-34.9011, -56.1645]
const TECHNICIAN_RADIUS_METERS = 500

function MapBoundsController({
  technicians,
  userLocation,
}: Pick<TechnicianMapProps, "technicians" | "userLocation">) {
  const map = useMap()

  const points = useMemo(() => {
    const nextPoints: Array<[number, number]> = []

    for (const technician of technicians) {
      const coordinates = technician.coordinates ?? getCoordinatesForLocation(technician.location)
      if (coordinates) {
        nextPoints.push([coordinates.lat, coordinates.lng])
      }
    }

    if (userLocation) {
      nextPoints.push([userLocation.lat, userLocation.lng])
    }

    return nextPoints
  }, [technicians, userLocation])

  useEffect(() => {
    if (points.length === 0) {
      map.setView(MONTEVIDEO_CENTER, 12)
      return
    }

    if (points.length === 1) {
      const [firstPoint] = points
      if (firstPoint) {
        map.setView(firstPoint, 13)
      }
      return
    }

    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] })
  }, [map, points])

  return null
}

function MapInteractionLayer({ onClearSelection }: { onClearSelection?: () => void }) {
  useMapEvents({
    click: () => {
      onClearSelection?.()
    },
  })

  return null
}

function formatDistance(distanceKm?: number | null): string | null {
  if (distanceKm === null || distanceKm === undefined) return null
  return distanceKm < 10 ? `${distanceKm.toFixed(1)} km` : `${Math.round(distanceKm)} km`
}

export function TechnicianMap({
  technicians,
  selectedId,
  userLocation = null,
  onClearSelection,
  onSelect,
}: TechnicianMapProps) {
  const mapReadyTechnicians = technicians
    .map((technician) => ({
      technician,
      coordinates: technician.coordinates ?? getCoordinatesForLocation(technician.location),
    }))
    .filter(
      (
        item
      ): item is {
        technician: TechnicianMapItem
        coordinates: { lat: number; lng: number }
      } => item.coordinates !== null
    )

  if (mapReadyTechnicians.length === 0) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center rounded-[1.75rem] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-6 text-center">
        <div>
          <p className="text-base font-semibold text-[#111827]">
            Los tecnicos aun no tienen ubicacion registrada
          </p>
          <p className="mt-2 text-sm text-[#6b7280]">
            Cambia a la vista de lista para comparar perfiles mientras completan su zona.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[#dbe4ea] bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)]">
      <MapContainer
        center={MONTEVIDEO_CENTER}
        zoom={12}
        scrollWheelZoom
        className="h-[60vh] min-h-[24rem] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsController technicians={technicians} userLocation={userLocation} />
        <MapInteractionLayer onClearSelection={onClearSelection} />

        {userLocation ? (
          <>
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={18}
              pathOptions={{ color: "#60a5fa", fillColor: "#93c5fd", fillOpacity: 0.25, weight: 1 }}
            />
            <CircleMarker
              center={[userLocation.lat, userLocation.lng]}
              radius={7}
              pathOptions={{ color: "#2563eb", fillColor: "#2563eb", fillOpacity: 0.95, weight: 2 }}
            />
          </>
        ) : null}

        {mapReadyTechnicians.map(({ technician, coordinates }) => {
          const isSelected = technician.id === selectedId

          return (
            <Circle
              key={technician.id}
              center={[coordinates.lat, coordinates.lng]}
              radius={TECHNICIAN_RADIUS_METERS}
              eventHandlers={{
                click: () => {
                  onSelect(technician.id)
                },
              }}
              pathOptions={{
                color: isSelected ? "#0f766e" : "#10b981",
                fillColor: isSelected ? "#14b8a6" : "#34d399",
                fillOpacity: 0.18,
                weight: isSelected ? 3 : 2,
              }}
            >
              <Popup>
                <div className="min-w-[14rem] space-y-2 py-1">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{technician.displayName}</p>
                    <p className="text-xs text-[#6b7280]">{technician.location}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">Cobertura aproximada de 250 m</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-[#4b5563]">
                    <span>{technician.rating.toFixed(1)} estrellas</span>
                    <span>{technician.reviewCount} resenas</span>
                    {formatDistance(technician.distanceKm) ? (
                      <span>{formatDistance(technician.distanceKm)}</span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    onClick={() => onSelect(technician.id)}
                  >
                    Seleccionar
                  </Button>
                </div>
              </Popup>
            </Circle>
          )
        })}
      </MapContainer>
    </div>
  )
}
