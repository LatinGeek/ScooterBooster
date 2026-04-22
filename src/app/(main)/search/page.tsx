import type { Metadata } from "next"
import Link from "next/link"
import { Bike, Search, Sparkles, Wrench } from "lucide-react"
import { getActiveBrands } from "@/lib/db/brands"
import { searchPlatform } from "@/lib/search"
import { GlobalSearchBox } from "@/components/global-search-box"
import { ServiceCard } from "@/components/service-card"
import { TechnicianCard } from "@/components/technician-card"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Buscar - ScooterBooster",
  description:
    "Buscá scooters, servicios y técnicos verificados en Uruguay para encontrar la mejor opción para tu scooter.",
}

function getQueryValue(value: string | string[] | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function buildSuggestedQueries(query: string) {
  const normalized = query.trim()
  const suggestions = [
    normalized ? `${normalized} montevideo` : "montevideo",
    normalized ? `${normalized} mantenimiento` : "mantenimiento",
    normalized ? `${normalized} xiaomi` : "xiaomi",
  ]

  return Array.from(new Set(suggestions.filter((item) => item.trim().length >= 2))).slice(0, 3)
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>
}) {
  const params = await searchParams
  const query = getQueryValue(params.q)

  const [results, brands] = await Promise.all([searchPlatform(query), getActiveBrands()])
  const brandById = new Map(brands.map((brand) => [brand.id, brand]))
  const totalResults =
    results.scooters.length + results.services.length + results.technicians.length
  const suggestedQueries = buildSuggestedQueries(query)

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#f8fffb_0%,#ffffff_30%,#f8fafc_100%)]">
      <section className="border-b border-[#e5e7eb] px-4 py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold tracking-[0.2em] text-[#10b981] uppercase">
              Búsqueda Global
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-[#111827]">
              Encontrá scooters, servicios y técnicos en un solo paso
            </h1>
            <p className="mt-4 text-lg text-[#6b7280]">
              La búsqueda tolera acentos para que moverte entre marcas, barrios y servicios sea más
              natural.
            </p>
          </div>

          <GlobalSearchBox
            key={query || "empty-search"}
            initialQuery={query}
            inputId="global-search-page"
            autoFocus={query.length === 0}
            wrapperClassName="relative"
            className="rounded-3xl border border-[#d1fae5] bg-white p-4 shadow-sm"
            inputClassName="flex h-12 items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-4"
            panelClassName="mt-3 rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-xl shadow-slate-200/60"
            placeholder="Ej.: Montevideo, Xiaomi, firmware"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        {query.length < 2 ? (
          <div className="rounded-[2rem] border border-dashed border-[#cbd5e1] bg-white/80 p-10 text-center shadow-sm">
            <Sparkles className="mx-auto h-10 w-10 text-[#10b981]" />
            <h2 className="mt-4 text-2xl font-bold text-[#111827]">
              Escribí al menos 2 caracteres
            </h2>
            <p className="mt-2 text-[#6b7280]">
              Probá con una marca, un barrio o un servicio para explorar el catálogo completo.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[#6b7280]">Resultados para</p>
                <p className="text-2xl font-bold text-[#111827]">“{query}”</p>
                <p className="mt-1 text-sm text-[#6b7280]">
                  {totalResults > 0
                    ? `Encontramos ${totalResults} coincidencia${totalResults === 1 ? "" : "s"} en toda la plataforma.`
                    : "Todavía no hay coincidencias exactas, pero te dejamos atajos para seguir explorando."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-[#6b7280]">
                <span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-[#047857]">
                  {results.scooters.length} scooters
                </span>
                <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-[#1d4ed8]">
                  {results.services.length} servicios
                </span>
                <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-[#92400e]">
                  {results.technicians.length} técnicos
                </span>
              </div>
            </div>

            {results.scooters.length === 0 &&
            results.services.length === 0 &&
            results.technicians.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-[#cbd5e1] bg-white/80 p-10 text-center shadow-sm">
                <Search className="mx-auto h-10 w-10 text-[#94a3b8]" />
                <h2 className="mt-4 text-2xl font-bold text-[#111827]">
                  No encontramos coincidencias todavía
                </h2>
                <p className="mt-2 text-[#6b7280]">
                  Probá con otra marca, un barrio distinto o un servicio más general.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link
                    href={query ? `/technicians?q=${encodeURIComponent(query)}` : "/technicians"}
                    className="inline-flex rounded-full bg-[#10b981] px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
                  >
                    Buscar técnicos
                  </Link>
                  <Link
                    href="/services"
                    className="inline-flex rounded-full border border-[#cbd5e1] px-5 py-2 text-sm font-semibold text-[#374151] transition-colors duration-200 hover:bg-[#f8fafc]"
                  >
                    Explorar servicios
                  </Link>
                </div>
                {suggestedQueries.length > 0 ? (
                  <div className="mt-6">
                    <p className="text-xs font-semibold tracking-[0.18em] text-[#94a3b8] uppercase">
                      Pruebas rápidas
                    </p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {suggestedQueries.map((suggestion) => (
                        <Link
                          key={suggestion}
                          href={`/search?q=${encodeURIComponent(suggestion)}`}
                          className="rounded-full bg-[#f8fafc] px-4 py-2 text-sm font-semibold text-[#374151] transition-colors duration-200 hover:bg-[#e2e8f0]"
                        >
                          {suggestion}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {results.scooters.length > 0 ? (
              <section>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-[#111827]">Scooters</h2>
                    <p className="text-sm text-[#6b7280]">
                      Modelos compatibles con upgrades y mantenimiento.
                    </p>
                  </div>
                  <Link
                    href="/scooters"
                    className="text-sm font-semibold text-[#10b981] transition-colors duration-200 hover:text-[#059669]"
                  >
                    Ver catálogo completo
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {results.scooters.map((model) => (
                    <Link
                      key={model.id}
                      href={`/scooters/${model.slug}`}
                      className="group rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecfdf5]">
                          <Bike className="h-5 w-5 text-[#059669]" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold tracking-[0.16em] text-[#10b981] uppercase">
                            {brandById.get(model.brandId)?.name ?? "Marca"}
                          </p>
                          <h3 className="text-lg font-semibold text-[#111827]">{model.name}</h3>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-[#6b7280]">
                        <div className="rounded-2xl bg-[#f8fafc] px-3 py-2">
                          <p className="text-xs tracking-[0.14em] text-[#9ca3af] uppercase">
                            Motor
                          </p>
                          <p className="mt-1 font-medium text-[#111827]">{model.specs.motor}</p>
                        </div>
                        <div className="rounded-2xl bg-[#f8fafc] px-3 py-2">
                          <p className="text-xs tracking-[0.14em] text-[#9ca3af] uppercase">
                            Autonomía
                          </p>
                          <p className="mt-1 font-medium text-[#111827]">{model.specs.range} km</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {results.services.length > 0 ? (
              <section>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-[#111827]">Servicios</h2>
                    <p className="text-sm text-[#6b7280]">
                      Opciones para potenciar, actualizar o mantener tu scooter.
                    </p>
                  </div>
                  <Link
                    href="/services"
                    className="text-sm font-semibold text-[#10b981] transition-colors duration-200 hover:text-[#059669]"
                  >
                    Ver todos los servicios
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {results.services.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))}
                </div>
              </section>
            ) : null}

            {results.technicians.length > 0 ? (
              <section>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-[#111827]">Técnicos</h2>
                    <p className="text-sm text-[#6b7280]">
                      Perfiles verificados con experiencia en Uruguay.
                    </p>
                  </div>
                  <Link
                    href="/technicians"
                    className="text-sm font-semibold text-[#10b981] transition-colors duration-200 hover:text-[#059669]"
                  >
                    Explorar directorio
                  </Link>
                </div>
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  {results.technicians.map((technician) => (
                    <TechnicianCard key={technician.id} technician={technician} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[2rem] border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ecfeff]">
                  <Wrench className="h-5 w-5 text-[#0891b2]" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[#111827]">
                    ¿Querés refinar por ubicación o servicio?
                  </h2>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    El directorio de técnicos ahora soporta filtros compartibles por URL para que
                    puedas guardar búsquedas o enviarle un enlace a otra persona.
                  </p>
                  <Link
                    href={query ? `/technicians?q=${encodeURIComponent(query)}` : "/technicians"}
                    className="mt-4 inline-flex text-sm font-semibold text-[#10b981] transition-colors duration-200 hover:text-[#059669]"
                  >
                    Ir al directorio filtrable
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  )
}
