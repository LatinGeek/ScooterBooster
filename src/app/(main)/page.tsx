import Link from "next/link"
import {
  Gauge,
  Cpu,
  Navigation,
  Wrench,
  ArrowRight,
  Star,
  Shield,
  MessageCircle,
} from "lucide-react"

const services = [
  {
    icon: Gauge,
    name: "Eliminación de Límite de Velocidad",
    description:
      "Eliminamos el límite de velocidad de fábrica para que tu scooter alcance su máximo potencial.",
    slug: "speed-limit",
  },
  {
    icon: Cpu,
    name: "Actualización de Firmware",
    description:
      "Actualizamos o personalizamos el firmware de tu scooter para optimizar rendimiento y autonomía.",
    slug: "firmware",
  },
  {
    icon: Navigation,
    name: "Control Crucero",
    description:
      "Activamos o configuramos el control crucero para una conducción más cómoda y eficiente.",
    slug: "cruise-control",
  },
  {
    icon: Wrench,
    name: "Mantenimiento General",
    description:
      "Servicio completo de mantenimiento: neumáticos, frenos, batería, diagnóstico y más.",
    slug: "maintenance",
  },
]

const steps = [
  {
    number: "1",
    title: "Elegí tu scooter",
    description: "Seleccioná la marca y modelo de tu scooter eléctrico.",
  },
  {
    number: "2",
    title: "Elegí el servicio",
    description: "Explorá los servicios disponibles y sus precios.",
  },
  {
    number: "3",
    title: "Reservá un técnico",
    description: "Elegí un técnico verificado, revisá sus reseñas y agendá tu cita.",
  },
]

export default function HomePage() {
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ScooterBooster",
    url: "https://scooterbooster.uy",
    logo: "https://scooterbooster.uy/icon.svg",
    sameAs: ["https://www.scooterbooster.uy"],
    areaServed: {
      "@type": "Country",
      name: "Uruguay",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "soporte@scooterbooster.uy",
      areaServed: "UY",
      availableLanguage: "es",
    },
  }

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* ── Hero Section — video background ─────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: "620px" }}>
        {/* Blurred video layer */}
        <video
          className="absolute inset-0 h-full w-full scale-105 object-cover"
          style={{ filter: "blur(3px)" }}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        >
          <source src="/assets/video/Hero-video.mp4" type="video/mp4" />
        </video>

        {/* Dark gradient overlay — improves text contrast */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 60%, rgba(5,150,105,0.25) 100%)",
          }}
        />

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-6xl px-4 py-24 text-center md:py-36">
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white md:text-6xl lg:text-7xl">
            Potenciá tu{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
              scooter eléctrico
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 md:text-xl">
            Conectamos dueños de scooters eléctricos con los mejores técnicos de Uruguay.
            Deslimitación, firmware, control de crucero y mantenimiento.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/services"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 font-semibold text-white shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-emerald-400/40"
            >
              Ver servicios
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/technicians"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
            >
              Encontrar técnicos
            </Link>
          </div>
        </div>
      </section>

      {/* ── Services Section ──────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">Nuestros servicios</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-500">
            Todo lo que necesitás para tu scooter eléctrico, en un solo lugar.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/services#${service.slug}`}
                className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <service.icon className="h-10 w-10 text-emerald-500" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{service.name}</h3>
                <p className="mt-2 text-sm text-gray-500">{service.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section className="bg-gray-50 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-gray-900">¿Cómo funciona?</h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-2xl font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-gray-900">{step.title}</h3>
                <p className="mt-2 text-gray-500">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Signals ────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-16 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <Shield className="h-12 w-12 text-emerald-500" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Técnicos verificados</h3>
              <p className="mt-2 text-sm text-gray-500">
                Todos nuestros técnicos son revisados y aprobados por nuestro equipo.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <Star className="h-12 w-12 text-amber-400" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Reseñas reales</h3>
              <p className="mt-2 text-sm text-gray-500">
                Calificaciones y comentarios de usuarios reales que ya usaron el servicio.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <MessageCircle className="h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Contacto directo</h3>
              <p className="mt-2 text-sm text-gray-500">
                Comunicación directa con tu técnico vía WhatsApp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Section ──────────────────────────────────────────────────── */}
      <section className="bg-emerald-500 px-4 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white">¿Listo para potenciar tu scooter?</h2>
          <p className="mt-4 text-lg text-emerald-100">
            Encontrá el técnico perfecto para tu scooter eléctrico en Uruguay.
          </p>
          <Link
            href="/scooters"
            className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-8 py-4 font-semibold text-emerald-600 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            Empezar ahora
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <h3 className="text-lg font-bold text-white">ScooterBooster</h3>
              <p className="mt-2 text-sm text-gray-400">
                Potenciá tu scooter eléctrico con los mejores técnicos de Uruguay.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white">Servicios</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/services" className="cursor-pointer transition-colors hover:text-white">
                    Deslimitación
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="cursor-pointer transition-colors hover:text-white">
                    Firmware
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="cursor-pointer transition-colors hover:text-white">
                    Control de crucero
                  </Link>
                </li>
                <li>
                  <Link href="/services" className="cursor-pointer transition-colors hover:text-white">
                    Mantenimiento
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white">Plataforma</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/scooters" className="cursor-pointer transition-colors hover:text-white">
                    Scooters
                  </Link>
                </li>
                <li>
                  <Link href="/technicians" className="cursor-pointer transition-colors hover:text-white">
                    Técnicos
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="cursor-pointer transition-colors hover:text-white">
                    Iniciar sesión
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white">Legal</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/legal/terms" className="cursor-pointer transition-colors hover:text-white">
                    Términos y condiciones
                  </Link>
                </li>
                <li>
                  <Link href="/legal/privacy" className="cursor-pointer transition-colors hover:text-white">
                    Política de privacidad
                  </Link>
                </li>
                <li>
                  <Link href="/legal/cookies" className="cursor-pointer transition-colors hover:text-white">
                    Política de cookies
                  </Link>
                </li>
                <li>
                  <Link href="/legal/faq" className="cursor-pointer transition-colors hover:text-white">
                    Preguntas frecuentes
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            © 2026 ScooterBooster. Todos los derechos reservados. Uruguay.
          </div>
        </div>
      </footer>
    </main>
  )
}
