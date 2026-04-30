import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight, MapPinned, Search, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { getActiveBrands } from "@/lib/db/brands"
import { getActiveServices } from "@/lib/db/services"
import { getDistanceToTechnician, searchTechnicians } from "@/lib/search"
import { getPresetBySlug, URUGUAY_LOCATION_PRESETS } from "@/lib/uruguay-locations"
import { TechnicianCard } from "@/components/technician-card"
import { LocationSortControls } from "./location-sort-controls"
import { RapidZoneControls } from "./rapid-zone-controls"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Tecnicos - ScooterBooster",
  description:
    "Encontra tecnicos verificados para tu scooter electrico en Uruguay. Especialistas en Xiaomi, Segway, Dualtron, Kaabo, VSETT, Zero e Inokim.",
}

function getSingleSearchParam(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function getMultiSearchParam(value: string | string[] | undefined): string[] {
  if (typeof value === "string") return value ? [value] : []
  if (Array.isArray(value)) return value.filter(Boolean)
  return []
}

function buildHrefFromParams(params: URLSearchParams): string {
  const query = params.toString()
  return query ? `/technicians?${query}` : "/technicians"
}

function buildTechnicianProfileHref(id: string, params: URLSearchParams): string {
  const query = params.toString()
  return query ? `/technicians/${id}?${query}` : `/technicians/${id}`
}

interface ActiveFilterChip {
  key: string
  label: string
  href: string
}

export default async function TechniciansPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[]
    service?: string | string[]
    brand?: string | string[]
    location?: string | string[]
    minRating?: string | string[]
    minPrice?: string | string[]
    maxPrice?: string | string[]
    lat?: string | string[]
    lng?: string | string[]
    near?: string | string[]
  }>
}) {
  const params = await searchParams
  const selectedServices = getMultiSearchParam(params.service)
  const query = getSingleSearchParam(params.q)
  const location = getSingleSearchParam(params.location)
  const brand = getSingleSearchParam(params.brand)
  const minRatingValue = getSingleSearchParam(params.minRating)
  const minPriceRaw = getSingleSearchParam(params.minPrice)
  const maxPriceRaw = getSingleSearchParam(params.maxPrice)
  const near = getSingleSearchParam(params.near)
  const latitudeRaw = getSingleSearchParam(params.lat)
  const longitudeRaw = getSingleSearchParam(params.lng)
  const minRating = minRatingValue ? Number(minRatingValue) : undefined
  const minPrice = minPriceRaw ? Number(minPriceRaw) : undefined
  const maxPrice = maxPriceRaw ? Number(maxPriceRaw) : undefined
  const latitude = latitudeRaw ? Number(latitudeRaw) : undefined
  const longitude = longitudeRaw ? Number(longitudeRaw) : undefined
  const hasCoordinates =
    latitude !== undefined &&
    longitude !== undefined &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)

  const [technicians, services, brands] = await Promise.all([
    searchTechnicians({
      query,
      serviceIds: selectedServices,
      brandId: brand || undefined,
      location: location || undefined,
      minRating,
      minPrice,
      maxPrice,
      latitude: hasCoordinates ? latitude : undefined,
      longitude: hasCoordinates ? longitude : undefined,
    }),
    getActiveServices(),
    getActiveBrands(),
  ])

  const currentSearchParams = new URLSearchParams()
  if (query) currentSearchParams.set("q", query)
  if (location) currentSearchParams.set("location", location)
  if (brand) currentSearchParams.set("brand", brand)
  if (minRatingValue) currentSearchParams.set("minRating", minRatingValue)
  if (minPriceRaw) currentSearchParams.set("minPrice", minPriceRaw)
  if (maxPriceRaw) currentSearchParams.set("maxPrice", maxPriceRaw)
  if (near) currentSearchParams.set("near", near)
  if (latitudeRaw) currentSearchParams.set("lat", latitudeRaw)
  if (longitudeRaw) currentSearchParams.set("lng", longitudeRaw)
  for (const serviceId of selectedServices) {
    currentSearchParams.append("service", serviceId)
  }

  const nearPreset = near ? getPresetBySlug(near) : null
  const nearbyLabel = near === "mi-ubicacion" ? "tu ubicacion" : (nearPreset?.label ?? null)
  const activeFilterCount = [
    query,
    location && nearbyLabel !== location ? location : null,
    brand,
    minRatingValue,
    minPriceRaw,
    maxPriceRaw,
    near,
    ...selectedServices,
  ].filter(Boolean).length

  const distanceByTechnicianId = new Map(
    technicians.map((technician) => [
      technician.id,
      hasCoordinates ? getDistanceToTechnician(technician, latitude, longitude) : null,
    ])
  )

  const selectedBrandName = brands.find((item) => item.id === brand)?.name
  const activeFilters: ActiveFilterChip[] = [
    query
      ? {
          key: "q",
          label: `Busqueda: ${query}`,
          href: buildHrefFromParams(
            (() => {
              const nextParams = new URLSearchParams(currentSearchParams.toString())
              nextParams.delete("q")
              return nextParams
            })()
          ),
        }
      : null,
    location && nearbyLabel !== location
      ? {
          key: "location",
          label: `Ubicacion: ${location}`,
          href: buildHrefFromParams(
            (() => {
              const nextParams = new URLSearchParams(currentSearchParams.toString())
              nextParams.delete("location")
              nextParams.delete("near")
              nextParams.delete("lat")
              nextParams.delete("lng")
              return nextParams
            })()
          ),
        }
      : null,
    selectedBrandName
      ? {
          key: "brand",
          label: `Marca: ${selectedBrandName}`,
          href: buildHrefFromParams(
            (() => {
              const nextParams = new URLSearchParams(currentSearchParams.toString())
              nextParams.delete("brand")
              return nextParams
            })()
          ),
        }
      : null,
    minRatingValue
      ? {
          key: "minRating",
          label: `Rating desde ${minRatingValue}`,
          href: buildHrefFromParams(
            (() => {
              const nextParams = new URLSearchParams(currentSearchParams.toString())
              nextParams.delete("minRating")
              return nextParams
            })()
          ),
        }
      : null,
    minPriceRaw || maxPriceRaw
      ? {
          key: "price",
          label: `Precio: ${minPriceRaw || "0"}-${maxPriceRaw || "sin tope"} UYU`,
          href: buildHrefFromParams(
            (() => {
              const nextParams = new URLSearchParams(currentSearchParams.toString())
              nextParams.delete("minPrice")
              nextParams.delete("maxPrice")
              return nextParams
            })()
          ),
        }
      : null,
    ...selectedServices
      .map((serviceId) => services.find((service) => service.id === serviceId))
      .filter((service): service is (typeof services)[number] => Boolean(service))
      .map((service) => ({
        key: `service-${service.id}`,
        label: `Servicio: ${service.name}`,
        href: buildHrefFromParams(
          (() => {
            const nextParams = new URLSearchParams(currentSearchParams.toString())
            const remainingServices = nextParams
              .getAll("service")
              .filter((value) => value !== service.id)
            nextParams.delete("service")
            for (const remainingService of remainingServices) {
              nextParams.append("service", remainingService)
            }
            return nextParams
          })()
        ),
      })),
    nearbyLabel
      ? {
          key: "near",
          label: `Cercania: ${nearbyLabel}`,
          href: buildHrefFromParams(
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
          ),
        }
      : null,
  ].filter((item): item is ActiveFilterChip => Boolean(item))

  const zeroStateSuggestions = [
    query ? { label: "Quitar busqueda", href: activeFilters.find((item) => item.key === "q")?.href } : null,
    selectedServices.length > 0
      ? {
          label: "Quitar servicios",
          href: buildHrefFromParams(
            (() => {
              const nextParams = new URLSearchParams(currentSearchParams.toString())
              nextParams.delete("service")
              return nextParams
            })()
          ),
        }
      : null,
    brand
      ? {
          label: "Ver todas las marcas",
          href: buildHrefFromParams(
            (() => {
              const nextParams = new URLSearchParams(currentSearchParams.toString())
              nextParams.delete("brand")
              return nextParams
            })()
          ),
        }
      : null,
    minPriceRaw || maxPriceRaw || minRatingValue
      ? {
          label: "Relajar precio y rating",
          href: buildHrefFromParams(
            (() => {
              const nextParams = new URLSearchParams(currentSearchParams.toString())
              nextParams.delete("minPrice")
              nextParams.delete("maxPrice")
              nextParams.delete("minRating")
              return nextParams
            })()
          ),
        }
      : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item?.href))

  return (
    <main>
      <section className="bg-gradient-to-b from-[#f0fdf4] to-white px-4 py-14 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#111827] md:text-5xl">
          Tecnicos Verificados
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#6b7280]">
          Filtra por servicio, marca, ubicacion y rango de precio para encontrar el mejor tecnico
          para tu scooter electrico.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[#10b981]">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-semibold">{technicians.length} tecnicos activos</span>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-[#e5e7eb] bg-[#111827] p-6 text-white shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-[#6ee7b7] uppercase">
              Sos tecnico?
            </p>
            <h2 className="mt-2 text-2xl font-bold">Postulate para aparecer en el catalogo</h2>
            <p className="mt-2 text-sm leading-6 text-[#d1d5db]">
              Si trabajas con scooters electricos, deja tu perfil listo para revision y sumate a
              la red de tecnicos verificados de ScooterBooster.
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
          <div className="rounded-[2rem] border border-[#dbe4ea] bg-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] lg:sticky lg:top-4 lg:z-20">
            <div className="border-b border-[#eef2f7] px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#ecfdf5] px-3 py-1 text-xs font-semibold text-[#047857]">
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    {activeFilterCount} filtro{activeFilterCount === 1 ? "" : "s"} activos
                  </div>
                  <h2 className="mt-3 text-2xl font-bold text-[#111827]">Descubri tu tecnico ideal</h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Busca por nombre, zona o marca y deja el directorio listo para comparar perfiles.
                  </p>
                </div>

                <div className="flex items-center gap-3 rounded-full bg-[#f8fafc] px-4 py-2 text-sm text-[#475569]">
                  <span className="font-semibold text-[#111827]">{technicians.length}</span>
                  resultado{technicians.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <form action="/technicians" className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)_220px_auto]">
                  <div>
                    <label htmlFor="tech-search" className="text-sm font-semibold text-[#111827]">
                      Buscar
                    </label>
                    <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#dbe4ea] bg-[#f8fafc] px-4 focus-within:border-[#10b981] focus-within:bg-white">
                      <Search className="h-4 w-4 text-[#6b7280]" />
                      <input
                        id="tech-search"
                        name="q"
                        defaultValue={query}
                        placeholder="Nombre, barrio o especialidad"
                        className="h-12 w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="tech-location" className="text-sm font-semibold text-[#111827]">
                      Ubicacion
                    </label>
                    <input
                      id="tech-location"
                      name="location"
                      defaultValue={location}
                      placeholder="Ej.: Montevideo, Pocitos"
                      className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4ea] bg-[#f8fafc] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#10b981] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label htmlFor="tech-brand" className="text-sm font-semibold text-[#111827]">
                      Marca
                    </label>
                    <select
                      id="tech-brand"
                      name="brand"
                      defaultValue={brand}
                      className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4ea] bg-[#f8fafc] px-4 text-sm text-[#111827] outline-none focus:border-[#10b981] focus:bg-white"
                    >
                      <option value="">Todas las marcas</option>
                      {brands.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:justify-end">
                    <button
                      type="submit"
                      className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-[#10b981] px-4 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
                    >
                      Aplicar
                    </button>
                    <Link
                      href="/technicians"
                      className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl border border-[#d1d5db] bg-white px-4 text-sm font-semibold text-[#374151] transition-colors duration-200 hover:bg-[#f8fafc]"
                    >
                      Limpiar
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <LocationSortControls
                    initialSearch={currentSearchParams.toString()}
                    hasNearbySort={hasCoordinates}
                  />

                  <div className="rounded-3xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eff6ff]">
                        <MapPinned className="h-5 w-5 text-[#2563eb]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">Zonas rapidas</p>
                        <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                          Cambia de zona con un toque para comparar tecnicos mas cerca de vos.
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

                <details className="group overflow-hidden rounded-[1.75rem] border border-[#dbe4ea] bg-[#f8fafc] shadow-sm">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-[#111827]">Filtros avanzados</p>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                          Opcional
                        </span>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-5 text-[#6b7280]">
                        Suma servicios, rating minimo y rango de precio para depurar el listado sin
                        perder el foco en las tarjetas.
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-[#475569]">
                      <span className="hidden sm:inline">Abrir</span>
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 group-open:rotate-90" />
                    </div>
                  </summary>

                  <div className="border-t border-[#e5e7eb] bg-white/70 px-4 py-4 sm:px-5">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
                      <div className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-[#111827]">Servicios</p>
                          <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                            Elige uno o varios tipos de trabajo.
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {services.map((service) => (
                            <label
                              key={service.id}
                              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-3 py-3 text-sm text-[#374151] transition-colors duration-200 hover:border-[#10b981] hover:bg-[#f0fdf4]"
                            >
                              <input
                                type="checkbox"
                                name="service"
                                value={service.id}
                                defaultChecked={selectedServices.includes(service.id)}
                                className="h-4 w-4 rounded border-[#d1d5db] text-[#10b981] focus:ring-[#10b981]"
                              />
                              <span className="leading-5">{service.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-[#111827]">Precio y confianza</p>
                          <p className="mt-1 text-xs leading-5 text-[#6b7280]">
                            Ajusta tu presupuesto y la reputacion minima deseada.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label htmlFor="tech-min-rating" className="text-sm font-semibold text-[#111827]">
                              Calificacion minima
                            </label>
                            <select
                              id="tech-min-rating"
                              name="minRating"
                              defaultValue={minRatingValue}
                              className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4ea] bg-[#f8fafc] px-4 text-sm text-[#111827] outline-none focus:border-[#10b981] focus:bg-white"
                            >
                              <option value="">Cualquiera</option>
                              <option value="4">4.0 o mas</option>
                              <option value="4.5">4.5 o mas</option>
                              <option value="4.8">4.8 o mas</option>
                            </select>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <label htmlFor="tech-min-price" className="text-sm font-semibold text-[#111827]">
                                Precio minimo
                              </label>
                              <input
                                id="tech-min-price"
                                name="minPrice"
                                type="number"
                                min="0"
                                step="100"
                                defaultValue={minPriceRaw}
                                placeholder="UYU"
                                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4ea] bg-[#f8fafc] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#10b981] focus:bg-white"
                              />
                            </div>

                            <div>
                              <label htmlFor="tech-max-price" className="text-sm font-semibold text-[#111827]">
                                Precio maximo
                              </label>
                              <input
                                id="tech-max-price"
                                name="maxPrice"
                                type="number"
                                min="0"
                                step="100"
                                defaultValue={maxPriceRaw}
                                placeholder="UYU"
                                className="mt-2 h-12 w-full rounded-2xl border border-[#dbe4ea] bg-[#f8fafc] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af] focus:border-[#10b981] focus:bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              </form>
            </div>
          </div>

          <div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-[#111827]">Tecnicos destacados para tu busqueda</h2>
                <p className="text-sm text-[#6b7280]">
                  Elige rapido desde las tarjetas y abre perfiles solo cuando quieras profundizar.
                </p>
              </div>
            </div>

            {activeFilters.length > 0 ? (
              <div className="mb-5 rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      Filtros activos ({activeFilters.length})
                    </p>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      Toca una chip para quitar solo ese filtro sin perder el resto de la busqueda.
                    </p>
                  </div>
                  <Link
                    href="/technicians"
                    scroll={false}
                    className="text-sm font-semibold text-[#10b981] transition-colors duration-200 hover:text-[#059669]"
                  >
                    Limpiar todo
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <Link
                      key={filter.key}
                      href={filter.href}
                      scroll={false}
                      className="rounded-full bg-[#f8fafc] px-3 py-1.5 text-sm font-semibold text-[#374151] transition-colors duration-200 hover:bg-[#e2e8f0]"
                    >
                      {filter.label} x
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            {nearbyLabel ? (
              <div className="mb-5 rounded-3xl border border-[#d1fae5] bg-[#f0fdf4] px-4 py-3 text-sm text-[#047857]">
                Ordenado por cercania aproximada a {nearbyLabel}.
              </div>
            ) : null}

            {technicians.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[#cbd5e1] bg-white px-6 py-16 text-center text-[#6b7280] shadow-sm">
                <Search className="mx-auto h-10 w-10 text-[#94a3b8]" />
                <h3 className="mt-4 text-2xl font-bold text-[#111827]">
                  No hay tecnicos para esta combinacion
                </h3>
                <p className="mt-2">
                  Prueba cambiando la ubicacion, relajando el precio o quitando algun servicio.
                </p>
                {zeroStateSuggestions.length > 0 ? (
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {zeroStateSuggestions.map((suggestion) => (
                      <Link
                        key={suggestion.label}
                        href={suggestion.href}
                        className="rounded-full bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-[#374151] transition-colors duration-200 hover:bg-[#e2e8f0]"
                      >
                        {suggestion.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
                <Link
                  href="/technicians"
                  className="mt-6 inline-flex cursor-pointer rounded-full bg-[#10b981] px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
                >
                  Ver todos los tecnicos
                </Link>
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
        <h2 className="text-2xl font-bold text-[#111827]">Sos tecnico de scooters?</h2>
        <p className="mt-2 text-[#6b7280]">
          Unite a nuestra red de tecnicos verificados y recibi reservas directamente.
        </p>
        <Link
          href="/technicians/apply"
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
        >
          Aplicar como tecnico
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}
