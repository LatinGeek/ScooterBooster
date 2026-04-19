import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Preguntas Frecuentes",
  description: "Respuestas a las preguntas más comunes sobre ScooterBooster.",
}

const FAQS = [
  {
    q: "¿Cómo funciona ScooterBooster?",
    a: "Buscás tu modelo de scooter, elegís el servicio que necesitás, seleccionás un técnico disponible, coordinás fecha y hora, y pagás en línea. El técnico va a tu domicilio o taller.",
  },
  {
    q: "¿Es legal eliminar el límite de velocidad?",
    a: "La modificación del límite de velocidad es legal solo para uso en propiedad privada y circuitos cerrados. Circular por vías públicas con un scooter modificado puede infringir el Decreto N° 348/020 de Uruguay. ScooterBooster no se responsabiliza por el uso en vía pública.",
  },
  {
    q: "¿Cómo se calculan los precios?",
    a: "Cada técnico fija su precio base por servicio. ScooterBooster agrega una comisión de servicio (generalmente 10%) sobre ese precio. El precio total que pagás incluye ambos.",
  },
  {
    q: "¿Puedo cancelar una reserva?",
    a: "Sí. Podés cancelar reservas en estado 'Pendiente de pago' sin costo desde tu panel. Para reservas confirmadas, contactá al técnico vía WhatsApp para coordinar.",
  },
  {
    q: "¿Qué pasa si el técnico no se presenta?",
    a: "Contactá a soporte en soporte@scooterbooster.uy. Gestionamos el reembolso y tomamos acciones sobre el técnico.",
  },
  {
    q: "¿Cómo me registro como técnico?",
    a: "Desde la página de técnicos, hacé clic en '¿Sos técnico? Sumate'. Completá tu perfil y esperá la aprobación del equipo de ScooterBooster (1-3 días hábiles).",
  },
  {
    q: "¿Cómo recibo pagos como técnico?",
    a: "Los pagos se procesan vía MercadoPago. Recibirás el precio base de cada servicio completado. La comisión de la plataforma es descontada antes del pago.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Sí. Cumplimos con la Ley 18.331 de Uruguay. Tus datos se almacenan en servidores seguros con cifrado. No vendemos tu información a terceros. Ver nuestra Política de Privacidad.",
  },
  {
    q: "¿Qué formas de pago aceptan?",
    a: "Aceptamos tarjetas de crédito/débito, transferencias y pagos en efectivo a través de MercadoPago (RedPagos, Abitab).",
  },
  {
    q: "¿Tienen soporte técnico?",
    a: "Sí. Escribínos a soporte@scooterbooster.uy o por WhatsApp (ver pie de página). Respondemos en horario hábil (lunes a viernes 9-18h).",
  },
]

export default function FAQPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <Link
        href="/legal"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#111827]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Legal
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-[#111827]">Preguntas Frecuentes</h1>
      <p className="mb-10 text-[#6b7280]">
        Todo lo que necesitás saber antes de usar ScooterBooster.
      </p>

      <div className="space-y-4">
        {FAQS.map((faq, i) => (
          <details
            key={i}
            className="group rounded-2xl border border-[#e5e7eb] bg-white shadow-sm"
          >
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-medium text-[#111827] [list-style:none]">
              {faq.q}
              <svg
                className="h-5 w-5 shrink-0 text-[#9ca3af] transition-transform duration-200 group-open:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="border-t border-[#f3f4f6] px-5 py-4 text-sm text-[#6b7280]">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </main>
  )
}
