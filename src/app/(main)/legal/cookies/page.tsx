import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Política de Cookies",
  description:
    "Cómo usa ScooterBooster las cookies esenciales, analíticas y de sesión en Uruguay.",
}

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href="/legal"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#111827]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Legal
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-[#111827]">Política de cookies</h1>
      <p className="mb-8 text-sm text-[#9ca3af]">Última actualización: abril 2026</p>

      <div className="space-y-6 text-sm leading-6 text-[#374151]">
        <section>
          <h2 className="text-lg font-semibold text-[#111827]">1. Qué son las cookies</h2>
          <p>
            Las cookies son pequeños archivos que el navegador guarda para recordar información de
            tu visita. En ScooterBooster las usamos para mantener tu sesión iniciada, reforzar la
            seguridad y entender de forma agregada cómo se usa la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">2. Qué cookies usamos</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Cookies esenciales:</strong> permiten iniciar sesión, mantener reservas y
              proteger formularios sensibles.
            </li>
            <li>
              <strong>Cookies de rendimiento:</strong> nos ayudan a medir disponibilidad y detectar
              errores de forma agregada cuando activamos herramientas analíticas.
            </li>
            <li>
              <strong>Preferencias locales:</strong> guardamos la aceptación del banner de cookies
              en tu navegador para no mostrarlo en cada visita.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">3. Qué no usamos</h2>
          <p>
            No usamos cookies publicitarias de terceros ni vendemos información personal para fines
            comerciales. Cualquier herramienta analítica se configura con foco en medición básica y
            observabilidad del servicio.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">4. Cómo podés gestionarlas</h2>
          <p>
            Podés borrar o bloquear cookies desde la configuración de tu navegador. Tené en cuenta
            que, si desactivás las cookies esenciales, algunas funciones como iniciar sesión,
            reservar o mantener tu panel activo pueden dejar de funcionar correctamente.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">5. Contacto</h2>
          <p>
            Si tenés dudas sobre esta política, escribinos a{" "}
            <a href="mailto:privacidad@scooterbooster.uy" className="text-[#10b981] hover:underline">
              privacidad@scooterbooster.uy
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
