import type { Metadata } from "next"
import Link from "next/link"
import { Gauge, Cpu, Navigation, Wrench, Clock, AlertTriangle, ChevronRight } from "lucide-react"
import { getActiveServices } from "@/lib/db/services"
import type { Service } from "@/types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Servicios — ScooterBooster",
  description:
    "Eliminación de límite de velocidad, firmware, control crucero y mantenimiento para scooters eléctricos en Uruguay.",
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "speed-limit": Gauge,
  firmware: Cpu,
  "cruise-control": Navigation,
  maintenance: Wrench,
}

const CATEGORY_PRICE_RANGES: Record<string, string> = {
  "speed-limit": "Desde $1.500 UYU",
  firmware: "Desde $1.000 UYU",
  "cruise-control": "Desde $1.200 UYU",
  maintenance: "Desde $800 UYU",
}

export default async function ServicesPage() {
  const services = await getActiveServices()
  const servicesJsonLd = {
    "@context": "https://schema.org",
    "@graph": services.map((service) => ({
      "@type": "Service",
      name: service.name,
      description: service.description,
      provider: {
        "@type": "Organization",
        name: "ScooterBooster",
        url: "https://scooterbooster.uy",
      },
      areaServed: {
        "@type": "Country",
        name: "Uruguay",
      },
      offers: {
        "@type": "Offer",
        priceCurrency: "UYU",
        availability: "https://schema.org/InStock",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "UYU",
          minPrice: CATEGORY_PRICE_RANGES[service.category]
            ?.replace(/[^\d]/g, "")
            ?.slice(0, 4),
        },
      },
      url: `https://scooterbooster.uy/services/${service.slug}`,
    })),
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesJsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#f0fdf4] to-white px-4 py-14 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#111827] md:text-5xl">
          Nuestros Servicios
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#6b7280]">
          Todos los servicios disponibles para tu scooter eléctrico, realizados por técnicos
          verificados en Uruguay.
        </p>
        <Link
          href="/booking"
          className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
        >
          Reservar ahora
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Services list */}
      <section className="mx-auto max-w-5xl px-4 py-12">
        {services.length === 0 ? (
          <div className="py-20 text-center text-[#9ca3af]">
            No hay servicios disponibles en este momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {services.map((service: Service) => {
              const Icon = CATEGORY_ICONS[service.category] ?? Wrench
              const priceRange = CATEGORY_PRICE_RANGES[service.category] ?? ""
              return (
                <div
                  key={service.id}
                  id={service.slug}
                  className="flex flex-col rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  {/* Icon + name */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f0fdf4]">
                      <Icon className="h-6 w-6 text-[#10b981]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-[#111827]">{service.name}</h2>
                      <p className="mt-1.5 text-sm text-[#6b7280]">{service.description}</p>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
                    <span className="font-semibold text-[#10b981]">{priceRange}</span>
                    <span className="flex items-center gap-1 text-[#9ca3af]">
                      <Clock className="h-3.5 w-3.5" />~{service.estimatedDuration} min
                    </span>
                  </div>

                  {/* Disclaimer warning */}
                  {service.requiresDisclaimer && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Solo para uso en propiedad privada. Requiere aceptar aviso legal antes de
                      reservar.
                    </div>
                  )}

                  {/* CTA */}
                  <div className="mt-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/services/${service.slug}`}
                        className="cursor-pointer text-sm font-semibold text-[#10b981] hover:underline"
                      >
                        Ver detalle
                      </Link>
                      <Link
                        href={`/booking?serviceId=${service.id}`}
                        className="cursor-pointer rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
                      >
                        Reservar
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* CTA banner */}
      <section className="border-t border-[#e5e7eb] bg-[#111827] px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-white">¿Tenés dudas sobre qué servicio elegir?</h2>
        <p className="mt-2 text-[#9ca3af]">
          Hablá directamente con un técnico. Te asesoramos sin cargo.
        </p>
        <Link
          href="/technicians"
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/20"
        >
          Ver técnicos disponibles
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}
