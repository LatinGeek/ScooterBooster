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
      "Analisis y respaldo del firmware actual antes de tocar parametros.",
      "Ajuste de limitadores de velocidad y validacion basica en banco.",
      "Chequeo posterior para confirmar que no queden errores de firmware.",
    ],
    whenYouNeedIt: [
      "Si usas el scooter en predios privados y queres liberar el potencial real del motor.",
      "Si ya actualizaste firmware antes y queres confirmar que el limite de fabrica sigue desactivado.",
      "Si notas que la velocidad maxima quedo recortada despues de una actualizacion oficial.",
    ],
    beforeBooking: [
      "Llega con bateria suficiente para validar aceleracion y respuesta final.",
      "Ten a mano el modelo exacto del scooter y si ya tuvo firmware modificado.",
      "Recuerda que este servicio exige aceptar el aviso legal de uso en propiedad privada.",
    ],
    faqs: [
      {
        question: "¿Pierdo el firmware original?",
        answer:
          "No deberias perderlo: el tecnico hace un respaldo previo para poder volver a una configuracion estable si hace falta.",
      },
      {
        question: "¿Siempre aumenta la velocidad final?",
        answer:
          "Depende del modelo, bateria y controlador. Algunos mejoran mucho y otros solo recuperan la velocidad real que ya podian dar.",
      },
    ],
  },
  firmware: {
    priceRange: "$1.000 - $3.000 UYU",
    included: [
      "Respaldo de version actual y revision del estado general del software.",
      "Actualizacion oficial o carga de firmware personalizado segun compatibilidad.",
      "Configuracion basica y prueba posterior para validar respuesta y funciones.",
    ],
    whenYouNeedIt: [
      "Si el scooter presenta errores de tablero, respuesta lenta o perdida de funciones.",
      "Si queres activar funciones compatibles como control de crucero o perfiles distintos.",
      "Si necesitas volver a una version conocida despues de una mala actualizacion.",
    ],
    beforeBooking: [
      "Indica si ya te instalaron firmware custom anteriormente.",
      "Trae el scooter con bateria suficiente para hacer respaldo y verificacion.",
      "Si viste un codigo de error concreto, agregalo en las notas de la reserva.",
    ],
    faqs: [
      {
        question: "¿Conviene firmware oficial o custom?",
        answer:
          "Depende de tu objetivo: oficial prioriza estabilidad, mientras que custom suele dar mas margen de configuracion y ajustes finos.",
      },
      {
        question: "¿Puedo perder configuraciones actuales?",
        answer:
          "Algunas si. Por eso el tecnico respalda la configuracion y te confirma antes de aplicar cambios que afecten manejo o autonomia.",
      },
    ],
  },
  "cruise-control": {
    priceRange: "$1.200 - $3.500 UYU",
    included: [
      "Evaluacion de compatibilidad por firmware o hardware segun modelo.",
      "Activacion del control de crucero y ajuste de sensibilidad o velocidad umbral.",
      "Prueba de seguridad para validar que active y corte correctamente.",
    ],
    whenYouNeedIt: [
      "Si haces trayectos largos y queres descansar la mano del acelerador.",
      "Si tu modelo soporta la funcion pero nunca quedo bien configurada.",
      "Si buscas una conduccion mas estable en avenidas o circuitos privados.",
    ],
    beforeBooking: [
      "Cuéntale al tecnico si ya tenes firmware custom o accesorios instalados.",
      "Aclara si buscas una configuracion suave o mas agresiva para activar la funcion.",
      "Lleva el scooter en condiciones de prueba para validar la desconexion del crucero.",
    ],
    faqs: [
      {
        question: "¿Todos los scooters pueden activarlo?",
        answer:
          "No. Algunos lo soportan por firmware y otros requieren hardware adicional o directamente no son compatibles.",
      },
      {
        question: "¿Se puede desactivar despues?",
        answer:
          "Si. El tecnico puede dejarlo deshabilitado o cambiar el umbral de activacion si la experiencia no te convence.",
      },
    ],
  },
  maintenance: {
    priceRange: "$800 - $5.000 UYU",
    included: [
      "Diagnostico general mecanico y electrico con foco en seguridad.",
      "Ajustes basicos de freno, direccion, plegado y elementos de rodadura.",
      "Recomendacion de repuestos o tareas extra si aparecen hallazgos fuera del mantenimiento base.",
    ],
    whenYouNeedIt: [
      "Si el scooter vibra, frena mal, hace ruidos o se siente flojo al manejar.",
      "Si queres una revision preventiva antes de usarlo a diario o venderlo.",
      "Si hace tiempo que no controlas bateria, cubiertas, tornilleria o sistema de frenos.",
    ],
    beforeBooking: [
      "Describe ruidos, vibraciones o sintomas concretos para priorizar la revision.",
      "Aclara si ya cambiaste cubiertas, frenos o bateria recientemente.",
      "Si tienes piezas para instalar, hablalo primero con el tecnico desde las notas.",
    ],
    faqs: [
      {
        question: "¿Incluye repuestos?",
        answer:
          "El mantenimiento base no siempre los incluye. Si surge una pieza para cambiar, el tecnico te lo confirma antes de avanzar.",
      },
      {
        question: "¿Sirve aunque el scooter parezca estar bien?",
        answer:
          "Si, porque muchas holguras, desgastes y caidas de rendimiento se detectan antes de que se transformen en una falla cara o insegura.",
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

      {guide ? (
        <section className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="space-y-6">
            <article className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-[#111827]">Que incluye</h2>
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
              <h2 className="text-2xl font-bold text-[#111827]">Cuando te conviene</h2>
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
                El precio final lo define cada tecnico segun modelo, dificultad, repuestos y zona
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
