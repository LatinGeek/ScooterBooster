import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  Zap,
  Route,
  Battery,
  Weight,
  Cpu,
  ChevronLeft,
  Gauge,
  Navigation,
  Wrench,
  AlertTriangle,
} from "lucide-react"
import { getModelBySlug } from "@/lib/db/models"
import { getBrandById } from "@/lib/db/brands"
import { getServicesByIds } from "@/lib/db/services"
import { getActiveTechnicians } from "@/lib/db/technicians"
import { TechnicianCard } from "@/components/technician-card"
import type { Service } from "@/types"

export const dynamic = "force-dynamic"

const SERVICE_ICONS: Record<string, React.ElementType> = {
  "speed-limit": Gauge,
  firmware: Cpu,
  "cruise-control": Navigation,
  maintenance: Wrench,
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const model = await getModelBySlug(id)
  if (!model) return { title: "Scooter no encontrado — ScooterBooster" }
  return {
    title: `${model.name} — ScooterBooster`,
    description: `Servicios de modificación y mantenimiento para el ${model.name}. Encontrá técnicos verificados en Uruguay.`,
  }
}

export default async function ScooterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const model = await getModelBySlug(id)
  if (!model) notFound()

  const [brand, compatibleServices, technicians] = await Promise.all([
    getBrandById(model.brandId),
    getServicesByIds(model.compatibleServices),
    getActiveTechnicians({ brandId: model.brandId, limit: 6 }),
  ])
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: model.name,
    brand: {
      "@type": "Brand",
      name: brand?.name ?? "Scooter",
    },
    category: "Electric Scooter",
    image: model.imageURL ? [`https://scooterbooster.uy${model.imageURL}`] : undefined,
    description: `Servicios de modificación, firmware y mantenimiento para ${model.name} en Uruguay.`,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Velocidad máxima", value: `${model.specs.maxSpeed} km/h` },
      { "@type": "PropertyValue", name: "Autonomía", value: `${model.specs.range} km` },
      { "@type": "PropertyValue", name: "Batería", value: model.specs.battery },
      { "@type": "PropertyValue", name: "Motor", value: model.specs.motor },
      { "@type": "PropertyValue", name: "Peso", value: `${model.specs.weight} kg` },
    ],
    url: `https://scooterbooster.uy/scooters/${model.slug}`,
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          href="/scooters"
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[#6b7280] transition-colors hover:text-[#10b981]"
        >
          <ChevronLeft className="h-4 w-4" />
          Catálogo de Scooters
        </Link>
      </nav>

      {/* Header */}
      <div className="mb-8">
        <p className="text-sm font-semibold tracking-wide text-[#10b981] uppercase">
          {brand?.name ?? ""}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold text-[#111827] md:text-4xl">{model.name}</h1>
      </div>

      {model.imageURL && (
        <section className="mb-8 overflow-hidden rounded-3xl border border-[#e5e7eb] bg-[radial-gradient(circle_at_top,#ecfdf5,white_70%)] shadow-sm">
          <div className="relative mx-auto max-w-4xl p-6">
            <Image
              src={model.imageURL}
              alt={`Foto del ${model.name}`}
              width={1400}
              height={900}
              className="h-auto w-full object-contain"
              priority
            />
          </div>
        </section>
      )}

      {/* Specs grid */}
      <section className="mb-12 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-semibold text-[#111827]">Especificaciones técnicas</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              icon: Zap,
              label: "Vel. máx",
              value: `${model.specs.maxSpeed} km/h`,
            },
            { icon: Route, label: "Autonomía", value: `${model.specs.range} km` },
            { icon: Battery, label: "Batería", value: model.specs.battery },
            { icon: Cpu, label: "Motor", value: model.specs.motor },
            {
              icon: Weight,
              label: "Peso",
              value: `${model.specs.weight} kg`,
            },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-xl bg-[#f9fafb] px-3 py-4 text-center"
            >
              <Icon className="h-6 w-6 text-[#10b981]" />
              <span className="mt-2 text-sm font-semibold text-[#111827]">{value}</span>
              <span className="text-xs text-[#9ca3af]">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Compatible services */}
      <section className="mb-12">
        <h2 className="mb-5 text-xl font-bold text-[#111827]">Servicios disponibles</h2>
        {compatibleServices.length === 0 ? (
          <p className="text-[#6b7280]">No hay servicios disponibles para este modelo.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {compatibleServices.map((service: Service) => {
              const Icon = SERVICE_ICONS[service.category] ?? Wrench
              return (
                <div
                  key={service.id}
                  className="rounded-xl border border-[#e5e7eb] bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0fdf4]">
                      <Icon className="h-5 w-5 text-[#10b981]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#111827]">{service.name}</h3>
                      <p className="mt-1 text-sm text-[#6b7280]">{service.description}</p>
                      {service.requiresDisclaimer && (
                        <div className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          Solo para uso en propiedad privada. Requiere aceptar aviso legal.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-[#9ca3af]">~{service.estimatedDuration} min</span>
                    <Link
                      href={`/booking?serviceId=${service.id}&modelId=${model.id}`}
                      className="cursor-pointer rounded-lg bg-[#10b981] px-4 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
                    >
                      Reservar
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Technicians */}
      {technicians.length > 0 && (
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#111827]">
              Técnicos que trabajan con {brand?.name}
            </h2>
            <Link
              href={`/technicians?brandId=${model.brandId}`}
              className="cursor-pointer text-sm font-semibold text-[#10b981] hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {technicians.map((tech) => (
              <TechnicianCard key={tech.id} technician={tech} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
