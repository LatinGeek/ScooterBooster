"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  MessageCircle,
  MonitorUp,
  Search,
  ShieldCheck,
  Star,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react"
import type { ReactNode } from "react"

type Service = {
  icon: LucideIcon
  name: string
  description: string
  slug: string
  price: string
  duration: string
  featured?: boolean
  note?: string
}

const services: Service[] = [
  {
    icon: Zap,
    name: "Eliminación de límite de velocidad",
    description:
      "Sacamos el límite de fábrica para que tu scooter dé lo que el motor puede dar. Solo para uso en propiedad privada.",
    slug: "speed-limit",
    price: "$1.500 UYU",
    duration: "~45 min",
    featured: true,
    note: "Aviso legal",
  },
  {
    icon: MonitorUp,
    name: "Actualización de firmware",
    description:
      "Versión oficial o firmware personalizado para optimizar rendimiento, autonomía y funciones del scooter.",
    slug: "firmware",
    price: "$1.000 UYU",
    duration: "~40 min",
  },
  {
    icon: Clock3,
    name: "Control crucero",
    description:
      "Activamos o configuramos el control crucero por firmware o hardware. Conducción más cómoda y eficiente.",
    slug: "cruise-control",
    price: "$1.200 UYU",
    duration: "~60 min",
  },
  {
    icon: Wrench,
    name: "Mantenimiento general",
    description:
      "Diagnóstico, frenos, neumáticos, batería y revisión de seguridad antes de que sea un problema.",
    slug: "maintenance",
    price: "$800 UYU",
    duration: "~90 min",
  },
]

const ribbonStats = [
  ["31", "Modelos catalogados"],
  ["5★", "Reseña promedio"],
  ["~60s", "Para reservar"],
  ["100%", "Pago via MercadoPago"],
]

const brands = [
  {
    name: "Xiaomi",
    fontFamily: '"Arial Black", "Arial Narrow", Arial, sans-serif',
    fontWeight: 900,
    fontStyle: "normal",
  },
  {
    name: "Joyor",
    fontFamily: '"Trebuchet MS", "Arial Rounded MT Bold", Arial, sans-serif',
    fontWeight: 800,
    fontStyle: "normal",
  },
  {
    name: "MiStyle",
    fontFamily: '"Gill Sans", "Trebuchet MS", Arial, sans-serif',
    fontWeight: 700,
    fontStyle: "italic",
  },
  {
    name: "Navee",
    fontFamily: 'Verdana, "Trebuchet MS", Arial, sans-serif',
    fontWeight: 800,
    fontStyle: "normal",
  },
  {
    name: "Atom",
    fontFamily: 'Impact, "Arial Black", Arial, sans-serif',
    fontWeight: 500,
    fontStyle: "normal",
  },
] satisfies Array<{
  name: string
  fontFamily: string
  fontWeight: number
  fontStyle: "normal" | "italic"
}>

const steps = [
  {
    icon: Search,
    label: "Paso uno",
    title: "Encontrá tu scooter",
    description:
      "Buscás por marca o modelo. Si está en el catálogo, ya sabés qué se le puede hacer y quién puede hacerlo.",
    example: (
      <>
        Xiaomi Scooter 4 Pro <strong className="text-[#111827]">4 servicios</strong>
      </>
    ),
  },
  {
    icon: Zap,
    label: "Paso dos",
    title: "Elegí el servicio",
    description:
      "Precios publicados desde el inicio, duración estimada y aviso legal cuando corresponde.",
    example: (
      <>
        Deslimitación <strong className="text-[#111827]">$1.500 UYU</strong>
      </>
    ),
  },
  {
    icon: CheckCircle2,
    label: "Paso tres",
    title: "Reservá un técnico",
    description:
      "Elegís técnico verificado, mirás reseñas, pagás la seña y coordinás por WhatsApp.",
    example: (
      <>
        Confirmado <strong className="text-[#111827]">martes 14:00</strong>
      </>
    ),
  },
]

const trustItems = [
  {
    icon: ShieldCheck,
    title: "Técnicos verificados",
    description:
      "Revisamos identidad, experiencia y referencias antes de habilitar a un técnico en el catálogo.",
    href: "/technicians",
    cta: "Ver técnicos",
  },
  {
    icon: CreditCard,
    title: "Reserva con seña",
    description:
      "Pagás solo la reserva online por MercadoPago. El resto se lo pagás al técnico cuando termina.",
    href: "/legal/faq#pagos",
    cta: "Cómo funciona el pago",
  },
  {
    icon: MessageCircle,
    title: "Contacto directo",
    description:
      "Una vez confirmada la reserva, coordinás día, hora y detalles por WhatsApp con el técnico.",
    href: "/legal/faq",
    cta: "Más sobre reservas",
  },
]

const faqs = [
  {
    question: "¿Es legal deslimitar mi scooter?",
    answer:
      "Solo para uso en propiedad privada y circuitos cerrados. Circular por vías públicas con un scooter modificado puede infringir la normativa vigente de Uruguay.",
  },
  {
    question: "¿Cuánto pago online y cuánto al técnico?",
    answer:
      "ScooterBooster cobra una reserva online para confirmar el turno por MercadoPago. El resto del servicio se lo pagás directo al técnico cuando termina el trabajo.",
  },
  {
    question: "¿Qué pasa si el técnico no se presenta?",
    answer:
      "Escribinos a nuestro soporte vía WhatsApp. Gestionamos el reembolso completo de la seña y tomamos acciones sobre el técnico.",
  },
  {
    question: "¿Mi modelo no aparece en el catálogo?",
    answer:
      "Mandanos marca, modelo y año por WhatsApp. La mayoría de los modelos Xiaomi, Joyor, MiStyle, Navee y Atom ya están listos.",
  },
]

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      className={className}
      initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.24 }}
      transition={{ duration: 0.62, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
  id,
}: {
  eyebrow: string
  title: string
  description: string
  id: string
}) {
  return (
    <Reveal className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-end">
      <div>
        <p className="flex items-center gap-3 text-xs font-bold text-[#059669] uppercase">
          <span className="h-0.5 w-6 bg-[#10b981]" aria-hidden="true" />
          {eyebrow}
        </p>
        <h2
          id={id}
          className="mt-3 max-w-xl text-3xl leading-tight font-black text-balance text-[#111827] sm:text-4xl md:text-5xl md:leading-none"
        >
          {title}
        </h2>
      </div>
      <p className="max-w-2xl text-base leading-7 text-[#4b5563]">{description}</p>
    </Reveal>
  )
}

export function HomePageClient() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <main className="overflow-hidden bg-[#fafafa] text-[#111827]">
      <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-[#07110f] px-4 py-6 text-white min-[360px]:py-10 sm:px-6 sm:py-16 md:py-24 lg:px-8">
        <video
          className="absolute inset-0 h-full w-full object-cover opacity-[0.34]"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source src="/assets/video/Hero-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,15,0.94),rgba(7,17,15,0.78),rgba(7,17,15,0.9))]" />
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(16,185,129,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-8rem)] max-w-7xl flex-col justify-center min-[360px]:min-h-[calc(100svh-9rem)] md:min-h-[calc(100vh-11rem)]">
          <div className="grid gap-9 md:grid-cols-[1.05fr_0.95fr] md:items-center lg:gap-12">
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-[#10b981]/30 bg-[#10b981]/10 px-3 py-2 text-[11px] leading-tight font-bold text-[#6ee7b7] uppercase sm:text-xs">
                <span className="h-2 w-2 rounded-full bg-[#10b981]" aria-hidden="true" />
                Hecho en Uruguay · Técnicos verificados
              </div>
              <h1 className="mt-5 max-w-4xl text-[2.25rem] leading-[0.95] font-black text-balance text-white min-[360px]:mt-7 min-[360px]:text-[2.65rem] sm:text-5xl md:text-7xl">
                <span className="relative inline-block text-white/45">
                  25 km/h.
                  <span className="absolute top-1/2 left-0 h-1 w-full -rotate-2 rounded-full bg-[#10b981]" />
                </span>
                <br />
                Más potencia.
                <br />
                <span className="text-[#34d399]">Sin límites.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#d1d5db] min-[360px]:mt-6 min-[360px]:text-base min-[360px]:leading-7 sm:text-lg sm:leading-8">
                <span className="sm:hidden">
                  Tu scooter puede dar más con técnicos verificados en Uruguay.
                </span>
                <span className="hidden sm:inline">
                  Tu scooter eléctrico puede dar más. Conectamos dueños con técnicos verificados que
                  liberan velocidad, actualizan firmware y mantienen tu equipo a punto.
                </span>
              </p>
              <div className="mt-5 flex flex-col gap-3 min-[360px]:mt-8 sm:flex-row sm:items-center sm:gap-4 md:flex-col md:items-stretch lg:flex-row lg:items-center">
                <motion.div
                  className="w-full sm:w-auto md:w-full lg:w-auto"
                  whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link
                    href="/booking"
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#10b981] px-5 py-3 text-center font-bold text-white shadow-lg shadow-[#10b981]/25 transition-colors hover:bg-[#059669] focus-visible:ring-2 focus-visible:ring-[#34d399] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07110f] focus-visible:outline-none sm:w-auto sm:px-6 md:w-full lg:w-auto"
                  >
                    Reservar ahora
                    <span className="hidden text-sm font-semibold text-white/75 min-[360px]:inline">
                      desde $800 UYU
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
                <Link
                  href="#como-funciona"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#34d399] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07110f] focus-visible:outline-none sm:w-auto md:w-full lg:w-auto"
                >
                  ¿Cómo funciona?
                  <ArrowDown className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-[auto_1fr] items-center gap-4 rounded-lg border border-[#10b981]/25 bg-[#0b1f1a]/80 p-4 md:hidden">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#10b981]">
                  <div className="text-center">
                    <p className="text-3xl leading-none font-black text-white">37</p>
                    <p className="mt-1 text-[10px] font-bold text-[#34d399] uppercase">km/h</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold tracking-wide text-[#34d399] uppercase">
                    Xiaomi 4 Ultra · Deslimitado
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["70", "km"],
                      ["500", "W"],
                      ["561", "Wh"],
                    ].map(([value, unit]) => (
                      <div key={unit} className="rounded-md bg-black/35 px-2 py-2">
                        <p className="text-base leading-none font-black text-white">{value}</p>
                        <p className="mt-1 text-[10px] font-bold text-[#9ca3af] uppercase">
                          {unit}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="relative mx-auto hidden w-full max-w-sm md:block md:max-w-none"
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96, y: 18 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.16, ease: "easeOut" }}
              aria-hidden="true"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg border border-[#10b981]/25 bg-[#0b1f1a]/90 shadow-2xl shadow-black/40">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(16,185,129,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.16) 1px, transparent 1px)",
                    backgroundSize: "32px 32px",
                  }}
                />
                <div className="absolute top-4 right-4 left-4 flex justify-between gap-4 text-[10px] font-bold text-[#d1d5db] uppercase lg:top-5 lg:right-5 lg:left-5 lg:text-[11px]">
                  <span>
                    Xiaomi <strong className="text-[#34d399]">4 Ultra</strong>
                  </span>
                  <span>
                    Status <strong className="text-[#34d399]">Deslimitado</strong>
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-[72%]">
                    <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        stroke="rgba(255,255,255,0.11)"
                        strokeWidth="2"
                        fill="none"
                      />
                      <motion.circle
                        cx="100"
                        cy="100"
                        r="80"
                        stroke="#10b981"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray="502"
                        initial={shouldReduceMotion ? false : { strokeDashoffset: 502 }}
                        animate={shouldReduceMotion ? undefined : { strokeDashoffset: 96 }}
                        transition={{ duration: 1.4, delay: 0.7, ease: "easeOut" }}
                      />
                      <g stroke="rgba(255,255,255,0.18)" strokeWidth="2">
                        <line x1="100" y1="10" x2="100" y2="22" />
                        <line x1="100" y1="178" x2="100" y2="190" />
                        <line x1="10" y1="100" x2="22" y2="100" />
                        <line x1="178" y1="100" x2="190" y2="100" />
                      </g>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <motion.span
                        className="text-6xl leading-none font-black text-white lg:text-8xl"
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.95 }}
                      >
                        37
                      </motion.span>
                      <span className="mt-2 text-xs font-bold text-[#34d399] uppercase">
                        km/h max
                      </span>
                    </div>
                  </div>
                </div>
                <div className="absolute right-4 bottom-4 left-4 grid grid-cols-3 gap-2 lg:right-5 lg:bottom-5 lg:left-5 lg:gap-3">
                  {[
                    ["Autonomía", "70 km"],
                    ["Motor", "500 W"],
                    ["Batería", "561 Wh"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-md border border-[#10b981]/20 bg-black/45 p-2 lg:p-3"
                    >
                      <p className="text-[10px] font-bold text-[#9ca3af] uppercase">{label}</p>
                      <p className="mt-1 text-sm font-black text-white lg:text-lg">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          <Reveal className="mt-9 grid grid-cols-2 gap-4 border-y border-white/10 py-5 sm:mt-14 sm:grid-cols-2 sm:py-6 lg:grid-cols-4">
            {ribbonStats.map(([number, label]) => (
              <div key={label}>
                <p className="text-2xl font-black text-[#34d399] sm:text-3xl">{number}</p>
                <p className="mt-1 text-[11px] leading-tight font-bold text-[#d1d5db] uppercase sm:text-xs">
                  {label}
                </p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section
        className="bg-[#07110f] px-4 py-10 text-white sm:px-6 lg:px-8"
        aria-label="Marcas con las que trabajamos"
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:gap-x-10 sm:gap-y-5">
          <span className="text-xs font-bold text-[#9ca3af] uppercase">Trabajamos con</span>
          {brands.map((brand) => (
            <Link
              key={brand.name}
              href={`/scooters?brand=${brand.name.toLowerCase()}`}
              className="text-lg font-black text-white/55 transition-colors hover:text-[#34d399] sm:text-xl"
              style={{
                fontFamily: brand.fontFamily,
                fontWeight: brand.fontWeight,
                fontStyle: brand.fontStyle,
                letterSpacing: 0,
              }}
            >
              {brand.name}
            </Link>
          ))}
        </div>
      </section>

      <section
        className="px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8"
        aria-labelledby="services-title"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="01 · Servicios"
            title="Todo en un lugar."
            description="Cuatro servicios para tu scooter eléctrico. Precios publicados, duración estimada y técnicos verificados. Reservás con seña y pagás el resto al técnico."
            id="services-title"
          />

          <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 md:grid-cols-2">
            {services.map((service, index) => (
              <motion.article
                key={service.slug}
                className={`group flex min-h-0 flex-col rounded-lg border p-5 transition-colors sm:min-h-72 sm:p-7 ${
                  service.featured
                    ? "border-[#111827] bg-[#111827] text-white"
                    : "border-[#e5e7eb] bg-white text-[#111827]"
                }`}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                whileHover={shouldReduceMotion ? undefined : { y: -5 }}
                viewport={{ once: true, amount: 0.18 }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-md ${
                      service.featured ? "bg-[#10b981] text-white" : "bg-[#d1fae5] text-[#065f46]"
                    }`}
                  >
                    <service.icon className="h-6 w-6" />
                  </div>
                  {service.note ? (
                    <span className="rounded-md border border-[#f59e0b]/40 bg-[#f59e0b]/10 px-2.5 py-1 text-xs font-bold text-[#fbbf24] uppercase">
                      {service.note}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-6 text-xl leading-tight font-black sm:text-2xl">
                  {service.name}
                </h3>
                <p
                  className={`mt-3 flex-1 leading-7 ${service.featured ? "text-[#d1d5db]" : "text-[#4b5563]"}`}
                >
                  {service.description}
                </p>
                <div
                  className={`mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-5 text-sm ${
                    service.featured ? "border-white/10" : "border-[#e5e7eb]"
                  }`}
                >
                  <span className="font-black">
                    <span className={service.featured ? "text-[#9ca3af]" : "text-[#6b7280]"}>
                      desde{" "}
                    </span>
                    {service.price}
                  </span>
                  <span className={service.featured ? "text-[#d1d5db]" : "text-[#6b7280]"}>
                    {service.duration}
                  </span>
                </div>
                <Link
                  href={`/services/${service.slug}`}
                  className={`mt-5 inline-flex items-center gap-2 font-bold transition-colors ${
                    service.featured ? "text-[#34d399]" : "text-[#059669]"
                  }`}
                >
                  Ver detalle
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-y border-[#e5e7eb] bg-[#f3f4f6] px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8"
        id="como-funciona"
        aria-labelledby="how-title"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="02 · Cómo funciona"
            title="Tres pasos. Sesenta segundos."
            description="Sin idas y vueltas por WhatsApp. Elegís tu scooter, elegís servicio, reservás. La seña va por MercadoPago, el resto se lo pagás al técnico cuando viene."
            id="how-title"
          />

          <ol className="mt-10 grid overflow-hidden rounded-lg border border-[#e5e7eb] bg-white sm:mt-12 md:grid-cols-3">
            {steps.map((step, index) => (
              <motion.li
                key={step.title}
                className="flex flex-col border-b border-[#e5e7eb] p-5 last:border-b-0 sm:p-7 md:border-r md:border-b-0 md:last:border-r-0"
                initial={shouldReduceMotion ? false : { opacity: 0, x: -16 }}
                whileInView={shouldReduceMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <div className="flex items-center gap-3 text-xs font-bold text-[#059669] uppercase">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#10b981] bg-[#d1fae5] text-sm text-[#065f46]">
                    {index + 1}
                  </span>
                  {step.label}
                </div>
                <h3 className="mt-6 text-xl font-black sm:mt-7 sm:text-2xl">{step.title}</h3>
                <p className="mt-3 leading-7 text-[#4b5563]">{step.description}</p>
                <div className="mt-7 flex items-center gap-3 rounded-md border border-[#e5e7eb] bg-[#fafafa] p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#111827] text-[#34d399]">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-semibold text-[#6b7280]">
                    {step.example}
                  </p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </section>

      <section
        className="bg-[#07110f] px-4 py-16 text-white sm:px-6 sm:py-20 md:py-28 lg:px-8"
        aria-labelledby="testimonial-title"
      >
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <Reveal>
            <p className="text-8xl leading-none font-black text-[#10b981]" aria-hidden="true">
              &quot;
            </p>
            <p className="mt-4 flex items-center gap-3 text-xs font-bold text-[#34d399] uppercase">
              <span className="h-0.5 w-6 bg-[#10b981]" aria-hidden="true" />
              03 · Reseñas
            </p>
            <h2
              id="testimonial-title"
              className="mt-3 text-3xl leading-tight font-black sm:text-4xl md:text-5xl"
            >
              Lo que dice quien ya probó.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <blockquote className="text-xl leading-8 font-bold text-white sm:text-2xl sm:leading-10 md:text-3xl">
              Llevé a deslimitar un <span className="bg-[#10b981]/25 px-1">Xiaomi 5 estándar</span>,
              quedó pronto <span className="bg-[#10b981]/25 px-1">en una hora</span>, todo
              impecable. Ya volví dos veces más por mantenimiento.
            </blockquote>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#10b981] text-lg font-black text-white">
                G
              </div>
              <div>
                <p className="font-bold">Germán</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#d1d5db]">
                  <span className="inline-flex text-[#f59e0b]" aria-label="5 de 5 estrellas">
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                    <Star className="h-4 w-4 fill-current" />
                  </span>
                  Reseñó a Jonathan Denis · Unión, MVD
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className="px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8"
        aria-labelledby="trust-title"
      >
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="04 · Por qué confiar"
            title="Sin sorpresas."
            description="Tu scooter es tuyo y vale plata. Por eso publicamos precios, verificamos técnicos y no nos quedamos con el pago del servicio."
            id="trust-title"
          />
          <div className="mt-10 grid overflow-hidden rounded-lg border border-[#e5e7eb] bg-white sm:mt-12 md:grid-cols-3">
            {trustItems.map((item) => (
              <div
                key={item.title}
                className="border-b border-[#e5e7eb] p-5 last:border-b-0 sm:p-7 md:border-r md:border-b-0 md:last:border-r-0"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#f3f4f6] text-[#111827]">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                <p className="mt-3 leading-7 text-[#4b5563]">{item.description}</p>
                <Link
                  href={item.href}
                  className="mt-5 inline-flex items-center gap-2 font-bold text-[#059669]"
                >
                  {item.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="bg-[#f3f4f6] px-4 py-16 sm:px-6 sm:py-20 md:py-28 lg:px-8"
        aria-labelledby="faq-title"
      >
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <p className="flex items-center gap-3 text-xs font-bold text-[#059669] uppercase">
              <span className="h-0.5 w-6 bg-[#10b981]" aria-hidden="true" />
              05 · Dudas frecuentes
            </p>
            <h2
              id="faq-title"
              className="mt-3 text-3xl leading-tight font-black text-[#111827] sm:text-4xl md:text-5xl"
            >
              Lo que más se pregunta.
            </h2>
            <p className="mt-6 leading-7 text-[#4b5563]">
              ¿No encontrás respuesta?{" "}
              <Link
                href="/legal/faq"
                className="font-bold text-[#059669] underline underline-offset-4"
              >
                Ver todas las preguntas
              </Link>
            </p>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="divide-y divide-[#d1d5db] border-y border-[#d1d5db]">
              {faqs.map((faq, index) => (
                <details
                  key={faq.question}
                  className="group py-5"
                  open={index === 0 ? true : undefined}
                >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-5 text-base leading-snug font-black text-[#111827] sm:text-lg">
                    {faq.question}
                    <span className="text-2xl leading-none text-[#059669] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 max-w-3xl leading-7 text-[#4b5563]">{faq.answer}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section
        className="relative overflow-hidden bg-[#07110f] px-4 py-16 text-center text-white sm:px-6 sm:py-20 md:py-28 lg:px-8"
        aria-labelledby="final-title"
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(115deg, transparent 0 48%, rgba(16,185,129,0.42) 48% 49%, transparent 49% 100%)",
            backgroundSize: "92px 92px",
          }}
        aria-hidden="true"
      />
        <Reveal className="relative z-10 mx-auto max-w-3xl">
          <Image
            src="/assets/scooterbooster-logo.png"
            alt=""
            aria-hidden="true"
            width={96}
            height={96}
            className="mx-auto h-20 w-20"
            unoptimized
          />
          <h2
            id="final-title"
            className="mt-5 text-4xl leading-none font-black sm:text-5xl md:text-7xl"
          >
            Reservá hoy.
            <br />
            <span className="text-[#34d399]">Andá mañana.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#d1d5db]">
            Un técnico verificado a un clic. Precios claros, pago seguro, sin idas y vueltas.
          </p>
          <div className="mt-9">
            <Link
              href="/booking"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#10b981] px-7 py-3 font-bold text-white shadow-lg shadow-[#10b981]/25 transition-colors hover:bg-[#059669] sm:w-auto"
            >
              Reservar ahora
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm font-semibold text-[#d1d5db]">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#34d399]" />
              Pago seguro MercadoPago
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#34d399]" />
              Reserva confirmada en minutos
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#34d399]" />
              Reembolso si el técnico no llega
            </span>
          </div>
        </Reveal>
      </section>

      <footer className="bg-[#111827] px-4 py-12 text-[#d1d5db] sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 border-b border-white/10 pb-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <p className="text-xl font-black text-white">ScooterBooster</p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#9ca3af]">
              Conectamos dueños de scooters eléctricos con los mejores técnicos verificados de
              Uruguay.
            </p>
          </div>
          <FooterColumn
            title="Servicios"
            links={[
              ["Deslimitación", "/services/speed-limit"],
              ["Firmware", "/services/firmware"],
              ["Control crucero", "/services/cruise-control"],
              ["Mantenimiento", "/services/maintenance"],
            ]}
          />
          <FooterColumn
            title="Plataforma"
            links={[
              ["Catálogo de scooters", "/scooters"],
              ["Técnicos", "/technicians"],
              ["Postularme como técnico", "/technicians/apply"],
              ["Iniciar sesión", "/login"],
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              ["Términos y condiciones", "/legal/terms"],
              ["Privacidad", "/legal/privacy"],
              ["Cookies", "/legal/cookies"],
              ["Preguntas frecuentes", "/legal/faq"],
            ]}
          />
        </div>
        <div className="mx-auto mt-8 flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm text-[#9ca3af]">
          <span>© 2026 ScooterBooster · Montevideo, Uruguay</span>
          <span>Cumplimos con la Ley 18.331 de Protección de Datos Personales</span>
        </div>
      </footer>
    </main>
  )
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-[#34d399] uppercase">{title}</h3>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map(([label, href]) => (
          <li key={href}>
            <Link href={href} className="transition-colors hover:text-[#34d399]">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
