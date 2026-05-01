import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, ChevronLeft, Clock, Cpu, Gauge, Navigation, Wrench } from "lucide-react"
import { getActiveBrands } from "@/lib/db/brands"
import { getModelsByService } from "@/lib/db/models"
import { getServiceBySlug } from "@/lib/db/services"
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
  "speed-limit": "Deslimitación",
  firmware: "Firmware",
  "cruise-control": "Control de crucero",
  maintenance: "Mantenimiento",
}

const SERVICE_GUIDES: Record<
  string,
  {
    priceRange: string
    included: string[]
    whenYouNeedIt: string[]
    beforeBooking: string[]
    faqs: Array<{ question: string; answer: string }>
  }
> = {
  "speed-limit": {
    priceRange: "$1.500 - $4.000 UYU",
    included: [
      "Análisis y respaldo del firmware actual antes de tocar parámetros.",
      "Ajuste de limitadores de velocidad y validación básica en banco.",
      "Chequeo posterior para confirmar que no queden errores de firmware.",
    ],
    whenYouNeedIt: [
      "Si usás el scooter en predios privados y querés liberar el potencial real del motor.",
      "Si ya actualizaste firmware antes y querés confirmar que el límite de fábrica sigue desactivado.",
      "Si notás que la velocidad máxima quedó recortada después de una actualización oficial.",
    ],
    beforeBooking: [
      "Llegá con batería suficiente para validar aceleración y respuesta final.",
      "Tené a mano el modelo exacto del scooter y si ya tuvo firmware modificado.",
      "Recordá que este servicio exige aceptar el aviso legal de uso en propiedad privada.",
    ],
    faqs: [
      {
        question: "¿Pierdo el firmware original?",
        answer:
          "No deberías perderlo: el técnico hace un respaldo previo para poder volver a una configuración estable si hace falta.",
      },
      {
        question: "¿Siempre aumenta la velocidad final?",
        answer:
          "Depende del modelo, batería y controlador. Algunos mejoran mucho y otros solo recuperan la velocidad real que ya podían dar.",
      },
    ],
  },
  firmware: {
    priceRange: "$1.000 - $3.000 UYU",
    included: [
      "Respaldo de versión actual y revisión del estado general del software.",
      "Actualización oficial o carga de firmware personalizado según compatibilidad.",
      "Configuración básica y prueba posterior para validar respuesta y funciones.",
    ],
    whenYouNeedIt: [
      "Si el scooter presenta errores de tablero, respuesta lenta o pérdida de funciones.",
      "Si querés activar funciones compatibles como control de crucero o perfiles distintos.",
      "Si necesitás volver a una versión conocida después de una mala actualización.",
    ],
    beforeBooking: [
      "Indicá si ya te instalaron firmware custom anteriormente.",
      "Traé el scooter con batería suficiente para hacer respaldo y verificación.",
      "Si viste un código de error concreto, agregalo en las notas de la reserva.",
    ],
    faqs: [
      {
        question: "¿Conviene firmware oficial o custom?",
        answer:
          "Depende de tu objetivo: oficial prioriza estabilidad, mientras que custom suele dar más margen de configuración y ajustes finos.",
      },
      {
        question: "¿Puedo perder configuraciones actuales?",
        answer:
          "Algunas sí. Por eso el técnico respalda la configuración y te confirma antes de aplicar cambios que afecten manejo o autonomía.",
      },
    ],
  },
  "cruise-control": {
    priceRange: "$1.200 - $3.500 UYU",
    included: [
      "Evaluación de compatibilidad por firmware o hardware según modelo.",
      "Activación del control de crucero y ajuste de sensibilidad o velocidad umbral.",
      "Prueba de seguridad para validar que active y corte correctamente.",
    ],
    whenYouNeedIt: [
      "Si hacés trayectos largos y querés descansar la mano del acelerador.",
      "Si tu modelo soporta la función pero nunca quedó bien configurada.",
      "Si buscás una conducción más estable en avenidas o circuitos privados.",
    ],
    beforeBooking: [
      "Cuéntale al técnico si ya tenés firmware custom o accesorios instalados.",
      "Aclará si buscás una configuración suave o más agresiva para activar la función.",
      "Llevá el scooter en condiciones de prueba para validar la desconexión del crucero.",
    ],
    faqs: [
      {
        question: "¿Todos los scooters pueden activarlo?",
        answer:
          "No. Algunos lo soportan por firmware y otros requieren hardware adicional o directamente no son compatibles.",
      },
      {
        question: "¿Se puede desactivar después?",
        answer:
          "Sí. El técnico puede dejarlo deshabilitado o cambiar el umbral de activación si la experiencia no te convence.",
      },
    ],
  },
  maintenance: {
    priceRange: "$800 - $5.000 UYU",
    included: [
      "Diagnóstico general mecánico y eléctrico con foco en seguridad.",
      "Ajustes básicos de freno, dirección, plegado y elementos de rodadura.",
      "Recomendación de repuestos o tareas extra si aparecen hallazgos fuera del mantenimiento base.",
    ],
    whenYouNeedIt: [
      "Si el scooter vibra, frena mal, hace ruidos o se siente flojo al manejar.",
      "Si querés una revisión preventiva antes de usarlo a diario o venderlo.",
      "Si hace tiempo que no controlás batería, cubiertas, tornillería o sistema de frenos.",
    ],
    beforeBooking: [
      "Describí ruidos, vibraciones o síntomas concretos para priorizar la revisión.",
      "Aclará si ya cambiaste cubiertas, frenos o batería recientemente.",
      "Si tenés piezas para instalar, hablalo primero con el técnico desde las notas.",
    ],
    faqs: [
      {
        question: "¿Incluye repuestos?",
        answer:
          "El mantenimiento base no siempre los incluye. Si surge una pieza para cambiar, el técnico te lo confirma antes de avanzar.",
      },
      {
        question: "¿Sirve aunque el scooter parezca estar bien?",
        answer:
          "Sí, porque muchas holguras, desgastes y caídas de rendimiento se detectan antes de que se transformen en una falla cara o insegura.",
      },
    ],
  },
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
    description: `${service.description} Reservá con técnicos verificados en Uruguay desde ScooterBooster.`,
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
  const guide = SERVICE_GUIDES[service.category]
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
            <p className="text-sm font-semibold uppercase tracking-wide text-[#10b981]">
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
              Duración estimada
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
              Este servicio está orientado a uso en propiedad privada y requiere aceptar el aviso
              legal antes de confirmar la reserva.
            </p>
          </div>
        )}
      </section>

      {guide ? (
        <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="space-y-6">
            <article className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-[#111827]">Qué incluye</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#4b5563]">
                {guide.included.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#10b981]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-[#111827]">Cuándo te conviene</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#4b5563]">
                {guide.whenYouNeedIt.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#111827]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-[#111827]">Preguntas frecuentes</h2>
              <div className="mt-4 space-y-4">
                {guide.faqs.map((faq) => (
                  <div key={faq.question} className="rounded-2xl bg-[#f9fafb] p-4">
                    <h3 className="font-semibold text-[#111827]">{faq.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#4b5563]">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside className="space-y-6">
            <article className="rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#10b981]">
                Rango orientativo
              </h2>
              <p className="mt-3 text-3xl font-extrabold text-[#111827]">{guide.priceRange}</p>
              <p className="mt-3 text-sm leading-6 text-[#6b7280]">
                El precio final lo define cada técnico según modelo, dificultad, repuestos y zona
                de trabajo.
              </p>
            </article>

            <article className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#111827]">Antes de reservar</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-[#4b5563]">
                {guide.beforeBooking.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </aside>
        </section>
      ) : null}

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#111827]">Scooters compatibles</h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Modelos que ya tenemos cargados y listos para reservar con este servicio.
            </p>
          </div>
          <Link href="/scooters" className="text-sm font-semibold text-[#10b981] hover:underline">
            Ver catálogo completo
          </Link>
        </div>

        {models.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-[#f9fafb] px-6 py-10 text-center text-[#6b7280]">
            Aún no hay modelos vinculados a este servicio en el catálogo.
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
            <h2 className="text-2xl font-bold text-[#111827]">Técnicos recomendados</h2>
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
            Todavía no hay técnicos aprobados para este servicio.
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
