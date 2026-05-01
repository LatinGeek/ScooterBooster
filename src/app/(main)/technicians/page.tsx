import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, MapPinned, Search, ShieldCheck } from "lucide-react"
import { TechnicianCard } from "@/components/technician-card"
import { getDistanceToTechnician, searchTechnicians } from "@/lib/search"
import { getPresetBySlug, URUGUAY_LOCATION_PRESETS } from "@/lib/uruguay-locations"
import { LocationSortControls } from "./location-sort-controls"
import { RapidZoneControls } from "./rapid-zone-controls"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Técnicos - ScooterBooster",
  description:
    "Encontrá técnicos verificados para tu scooter eléctrico en Uruguay. Especialistas en Xiaomi, Segway, Dualtron, Kaabo, VSETT, Zero e Inokim.",
}

function getSingleSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function buildHrefFromParams(params: URLSearchParams): string {
  const query = params.toString()
  return query ? `/technicians?${query}` : "/technicians"
}

function buildTechnicianProfileHref(id: string, params: URLSearchParams): string {
  const query = params.toString()
  return query ? `/technicians/${id}?${query}` : `/technicians/${id}`
}

export default async function TechniciansPage({
  searchParams,
}: {
  searchParams: Promise<{
    location?: string | string[]
    lat?: string | string[]
    lng?: string | string[]
    near?: string | string[]
  }>
}) {
  const params = await searchParams
  const location = getSingleSearchParam(params.location)
  const near = getSingleSearchParam(params.near)
  const latitudeRaw = getSingleSearchParam(params.lat)
  const longitudeRaw = getSingleSearchParam(params.lng)
  const latitude = latitudeRaw ? Number(latitudeRaw) : undefined
  const longitude = longitudeRaw ? Number(longitudeRaw) : undefined
  const hasCoordinates =
    latitude !== undefined &&
    longitude !== undefined &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)

  const technicians = await searchTechnicians({
    location: location || undefined,
    latitude: hasCoordinates ? latitude : undefined,
    longitude: hasCoordinates ? longitude : undefined,
  })

  const currentSearchParams = new URLSearchParams()
  if (location) currentSearchParams.set("location", location)
  if (near) currentSearchParams.set("near", near)
  if (latitudeRaw) currentSearchParams.set("lat", latitudeRaw)
  if (longitudeRaw) currentSearchParams.set("lng", longitudeRaw)

  const nearPreset = near ? getPresetBySlug(near) : null
  const nearbyLabel = near === "mi-ubicacion" ? "tu ubicación" : (nearPreset?.label ?? null)

  const distanceByTechnicianId = new Map(
    technicians.map((technician) => [
      technician.id,
      hasCoordinates ? getDistanceToTechnician(technician, latitude, longitude) : null,
    ])
  )

  return (
    <main>
      <section className="bg-gradient-to-b from-[#f0fdf4] to-white px-4 py-14 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#111827] md:text-5xl">
          Técnicos Verificados
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#6b7280]">
          Descubrí técnicos cercanos para tu scooter eléctrico usando tu ubicación o zonas rápidas
          de Uruguay.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[#10b981]">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-semibold">{technicians.length} técnicos activos</span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-[#e5e7eb] bg-[#111827] p-6 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6ee7b7]">
              ¿Sos técnico?
            </p>
            <h2 className="mt-2 text-2xl font-bold">Postulate para aparecer en el catálogo</h2>
            <p className="mt-2 text-sm leading-6 text-[#d1d5db]">
              Si trabajás con scooters eléctricos, dejá tu perfil listo para revisión y sumate a
              la red de técnicos verificados de ScooterBooster.
            </p>
          </div>
          <Link
            href="/technicians/apply"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-[#111827] transition-colors hover:bg-[#ecfdf5]"
          >
            Quiero postularme
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-[#dbe4ea] bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)]">
            <div className="border-b border-[#eef2f7] px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[#111827]">Descubrí tu técnico ideal</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Priorizá cercanía y cambiá de zona sin perder espacio para las tarjetas.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-[#f8fafc] px-3 py-1.5 text-sm text-[#475569]">
                  <span className="font-semibold text-[#111827]">{technicians.length}</span>
                  resultado{technicians.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            <div className="px-4 py-4 sm:px-5 lg:sticky lg:top-4 lg:z-20 lg:rounded-b-[1.75rem] lg:bg-white">
              <div className="grid gap-3 xl:grid-cols-2">
                <LocationSortControls
                  initialSearch={currentSearchParams.toString()}
                  hasNearbySort={hasCoordinates}
                />

                <div className="rounded-[1.5rem] border border-[#e5e7eb] bg-[#f8fafc] p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eff6ff]">
                      <MapPinned className="h-4.5 w-4.5 text-[#2563eb]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">Zonas rápidas</p>
                      <p className="mt-0.5 text-xs leading-5 text-[#6b7280]">
                        Saltá entre zonas para comparar técnicos cercanos.
                      </p>
                    </div>
                  </div>

                  <RapidZoneControls
                    initialSearch={currentSearchParams.toString()}
                    presets={URUGUAY_LOCATION_PRESETS}
                    selectedNear={near}
                    selectedLocation={location}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-[#111827]">Técnicos destacados para tu búsqueda</h2>
                <p className="text-sm text-[#6b7280]">
                  Elegí rápido desde las tarjetas y abrí perfiles solo cuando quieras profundizar.
                </p>
              </div>
            </div>

            {nearbyLabel ? (
              <div className="mb-5 rounded-3xl border border-[#d1fae5] bg-[#f0fdf4] px-4 py-3 text-sm text-[#047857]">
                Ordenado por cercanía aproximada a {nearbyLabel}.
              </div>
            ) : null}

            {technicians.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[#cbd5e1] bg-white px-6 py-16 text-center text-[#6b7280] shadow-sm">
                <Search className="mx-auto h-10 w-10 text-[#94a3b8]" />
                <h3 className="mt-4 text-2xl font-bold text-[#111827]">
                  No hay técnicos para esta combinación
                </h3>
                <p className="mt-2">
                  Probá usando tu ubicación, cambiando de zona o quitando la cercanía actual.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {nearbyLabel ? (
                    <Link
                      href={buildHrefFromParams(
                        (() => {
                          const nextParams = new URLSearchParams(currentSearchParams.toString())
                          if (location === nearbyLabel) {
                            nextParams.delete("location")
                          }
                          nextParams.delete("near")
                          nextParams.delete("lat")
                          nextParams.delete("lng")
                          return nextParams
                        })()
                      )}
                      className="rounded-full bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-[#374151] transition-colors duration-200 hover:bg-[#e2e8f0]"
                    >
                      Quitar cercanía
                    </Link>
                  ) : null}
                  <Link
                    href="/technicians"
                    className="rounded-full bg-[#10b981] px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
                  >
                    Ver todos los técnicos
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
                {technicians.map((tech) => (
                  <TechnicianCard
                    key={tech.id}
                    technician={tech}
                    distanceKm={distanceByTechnicianId.get(tech.id) ?? null}
                    href={buildTechnicianProfileHref(tech.slug, currentSearchParams)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-[#e5e7eb] bg-[#f9fafb] px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-[#111827]">¿Sos técnico de scooters?</h2>
        <p className="mt-2 text-[#6b7280]">
          Unite a nuestra red de técnicos verificados y recibí reservas directamente.
        </p>
        <Link
          href="/technicians/apply"
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
        >
          Aplicar como técnico
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}
