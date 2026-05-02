import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Términos y Condiciones",
  description: "Términos y condiciones de uso de la plataforma ScooterBooster.",
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href="/legal"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#111827]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Legal
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-[#111827]">Términos y Condiciones</h1>
      <p className="mb-8 text-sm text-[#9ca3af]">Última actualización: abril 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-[#374151]">
        <section>
          <h2 className="text-lg font-semibold text-[#111827]">1. Aceptación de los Términos</h2>
          <p>
            Al acceder y utilizar la plataforma ScooterBooster (&quot;la Plataforma&quot;), usted
            acepta cumplir con estos Términos y Condiciones. Si no está de acuerdo, no utilice la
            Plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">2. Descripción del Servicio</h2>
          <p>
            ScooterBooster es una plataforma digital que conecta propietarios de scooters eléctricos
            con técnicos especializados en Uruguay para la realización de servicios de
            mantenimiento, actualización de firmware, instalación de control de crucero y
            modificación de limitadores de velocidad.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">
            3. Modificación del Límite de Velocidad
          </h2>
          <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
            <p className="font-semibold text-amber-800">Aviso Legal Obligatorio</p>
            <p className="mt-1 text-amber-700">
              La modificación del límite de velocidad de su scooter eléctrico está destinada
              únicamente para uso en propiedad privada y circuitos cerrados. ScooterBooster no se
              responsabiliza por el uso de scooters modificados en vías públicas. El usuario asume
              toda responsabilidad por el cumplimiento de las normativas de tránsito vigentes en
              Uruguay (Decreto N 348/020 y normativa de UNIT).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">4. Comisiones y Pagos</h2>
          <p>
            ScooterBooster cobra una reserva online (porcentaje configurable, mínimo 10 %) sobre
            el precio base del técnico para confirmar el turno. Ese importe se procesa a través de
            MercadoPago. El pago del servicio prestado por el técnico se coordina y realiza
            directamente entre usuario y técnico, sin intermediación de ScooterBooster.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">5. Cancelaciones y Reembolsos</h2>
          <p>
            El usuario puede cancelar una reserva en estado &quot;pendiente de pago&quot; sin costo.
            Las cancelaciones de reservas confirmadas están sujetas a la política de cada técnico.
            Los reembolsos se procesan a través de MercadoPago en un plazo de 5 a 10 días hábiles.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">6. Responsabilidades del Usuario</h2>
          <p>El usuario se compromete a:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Proporcionar información veraz al registrarse y reservar.</li>
            <li>Usar los servicios de acuerdo con la normativa vigente en Uruguay.</li>
            <li>No usar la plataforma para fines ilegales o fraudulentos.</li>
            <li>Asumir responsabilidad por el uso de equipos modificados en vías públicas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">
            7. Responsabilidades de los Técnicos
          </h2>
          <p>
            Los técnicos son profesionales independientes. ScooterBooster actúa como intermediario y
            no es responsable de la calidad o resultado de los servicios prestados por los técnicos.
            Los técnicos deben contar con las habilitaciones pertinentes para operar.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">8. Limitacion de Responsabilidad</h2>
          <p>
            ScooterBooster no sera responsable por danos directos, indirectos, incidentales o
            consecuentes derivados del uso de la plataforma o los servicios contratados.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">9. Ley Aplicable</h2>
          <p>
            Estos terminos se rigen por las leyes de la Republica Oriental del Uruguay. Cualquier
            disputa sera resuelta en los tribunales competentes de Montevideo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">10. Contacto</h2>
          <p>
            Para consultas sobre estos terminos, contacte a{" "}
            <a href="mailto:legal@scooterbooster.uy" className="text-[#10b981] hover:underline">
              legal@scooterbooster.uy
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
