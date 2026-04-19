import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ChevronLeft, Clock, Cpu, Gauge, Navigation, Wrench } from "lucide-react"
import { getServiceBySlug } from "@/lib/db/services"
import { getModelsByService } from "@/lib/db/models"
import { getActiveBrands } from "@/lib/db/brands"
import { getActiveTechnicians } from "@/lib/db/technicians"
import { ScooterCard } from "@/components/scooter-card"
import { TechnicianCard } from "@/components/technician-card"
import type { ScooterModel } from "@/types"

export const dynamic = "force-dynamic"

const SERVICE_ICONS: Record<string, React.ElementType> = {
  "speed-limit": Gauge,
  firmware: Cpu,
  "cruise-control": Navigation,
  maintenance: Wrench,
}

const CATEGORY_LABELS: Record<string, string> = {
  "speed-limit": "Deslimitacion",
  firmware: "Firmware",
  "cruise-control": "Control de crucero",
  maintenance: "Mantenimiento",
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const service = await getServiceBySlug(slug)

  if (!service) {
    return {
      title: "Servicio no encontrado - ScooterBooster",
    }
  }

  return {
    title: `${service.name} - ScooterBooster`,
    description: `${service.description} Reserva con tecnicos verificados en Uruguay desde ScooterBooster.`,
  }
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const service = await getServiceBySlug(slug)

  if (!service) notFound()

  const [models, brands, technicians] = await Promise.all([
    getModelsByService(service.id),
    getActiveBrands(),
    getActiveTechnicians({ serviceId: service.id, limit: 6 }),
  ])

  const Icon = SERVICE_ICONS[service.category] ?? Wrench
  const brandNames = new Map(brands.map((brand) => [brand.id, brand.name]))
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.description,
    serviceType: CATEGORY_LABELS[service.category] ?? service.category,
    provider: {
      "@type": "Organization",
      name: "ScooterBooster",
      url: "https://scooterbooster.uy",
    },
    areaServed: {
      "@type": "Country",
      name: "Uruguay",
    },
    url: `https://scooterbooster.uy/services/${service.slug}`,
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <nav className="mb-6">
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] transition-colors hover:text-[#10b981]"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a servicios
        </Link>
      </nav>

      <section className="rounded-3xl border border-[#e5e7eb] bg-[linear-gradient(135deg,#ecfdf5,white_65%)] p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Icon className="h-7 w-7 text-[#10b981]" />
            </div>
            <p className="text-sm font-semibold tracking-wide text-[#10b981] uppercase">
              {CATEGORY_LABELS[service.category] ?? service.category}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-[#111827] md:text-4xl">
              {service.name}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#4b5563]">
              {service.description}
            </p>
          </div>

          <div className="min-w-[240px] rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <Clock className="h-4 w-4 text-[#10b981]" />
              Duracion estimada
            </div>
            <p className="mt-2 text-2xl font-extrabold text-[#111827]">
              {service.estimatedDuration} min
            </p>
            <Link
              href={`/booking/new?service=${service.id}`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[#10b981] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#059669]"
            >
              Reservar este servicio
            </Link>
          </div>
        </div>

        {service.requiresDisclaimer && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Este servicio esta orientado a uso en propiedad privada y requiere aceptar el aviso
              legal antes de confirmar la reserva.
            </p>
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#111827]">Scooters compatibles</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Modelos que ya tenemos cargados y listos para reservar con este servicio.
            </p>
          </div>
          <Link href="/scooters" className="text-sm font-semibold text-[#10b981] hover:underline">
            Ver catalogo completo
          </Link>
        </div>

        {models.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-[#f9fafb] px-6 py-10 text-center text-[#6b7280]">
            Aun no hay modelos vinculados a este servicio en el catalogo.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {models.map((model: ScooterModel) => (
              <ScooterCard
                key={model.id}
                model={model}
                brandName={brandNames.get(model.brandId) ?? "Scooter"}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#111827]">Tecnicos recomendados</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Profesionales verificados que ofrecen este servicio en ScooterBooster.
            </p>
          </div>
          <Link
            href={`/technicians?serviceId=${service.id}`}
            className="text-sm font-semibold text-[#10b981] hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {technicians.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-[#f9fafb] px-6 py-10 text-center text-[#6b7280]">
            Todavia no hay tecnicos aprobados para este servicio.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {technicians.map((technician) => (
              <TechnicianCard key={technician.id} technician={technician} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
