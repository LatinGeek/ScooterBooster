import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Terminos y Condiciones",
  description: "Terminos y condiciones de uso de la plataforma ScooterBooster.",
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

      <h1 className="mb-2 text-3xl font-bold text-[#111827]">Terminos y Condiciones</h1>
      <p className="mb-8 text-sm text-[#9ca3af]">Ultima actualizacion: abril 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-[#374151]">
        <section>
          <h2 className="text-lg font-semibold text-[#111827]">1. Aceptacion de los Terminos</h2>
          <p>
            Al acceder y utilizar la plataforma ScooterBooster (&quot;la Plataforma&quot;), usted
            acepta cumplir con estos Terminos y Condiciones. Si no esta de acuerdo, no utilice la
            Plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">2. Descripcion del Servicio</h2>
          <p>
            ScooterBooster es una plataforma digital que conecta propietarios de scooters electricos
            con tecnicos especializados en Uruguay para la realizacion de servicios de
            mantenimiento, actualizacion de firmware, instalacion de control de crucero y
            modificacion de limitadores de velocidad.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">
            3. Modificacion del Limite de Velocidad
          </h2>
          <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3">
            <p className="font-semibold text-amber-800">Aviso Legal Obligatorio</p>
            <p className="mt-1 text-amber-700">
              La modificacion del limite de velocidad de su scooter electrico esta destinada
              unicamente para uso en propiedad privada y circuitos cerrados. ScooterBooster no se
              responsabiliza por el uso de scooters modificados en vias publicas. El usuario asume
              toda responsabilidad por el cumplimiento de las normativas de transito vigentes en
              Uruguay (Decreto N 348/020 y normativa de UNIT).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">4. Comisiones y Pagos</h2>
          <p>
            ScooterBooster cobra una reserva online (porcentaje configurable, minimo 10 %) sobre
            el precio base del tecnico para confirmar el turno. Ese importe se procesa a traves de
            MercadoPago. El pago del servicio prestado por el tecnico se coordina y realiza
            directamente entre usuario y tecnico, sin intermediacion de ScooterBooster.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">5. Cancelaciones y Reembolsos</h2>
          <p>
            El usuario puede cancelar una reserva en estado &quot;pendiente de pago&quot; sin costo.
            Las cancelaciones de reservas confirmadas estan sujetas a la politica de cada tecnico.
            Los reembolsos se procesan a traves de MercadoPago en un plazo de 5 a 10 dias habiles.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">6. Responsabilidades del Usuario</h2>
          <p>El usuario se compromete a:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Proporcionar informacion veraz al registrarse y reservar.</li>
            <li>Usar los servicios de acuerdo con la normativa vigente en Uruguay.</li>
            <li>No usar la plataforma para fines ilegales o fraudulentos.</li>
            <li>Asumir responsabilidad por el uso de equipos modificados en vias publicas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">
            7. Responsabilidades de los Tecnicos
          </h2>
          <p>
            Los tecnicos son profesionales independientes. ScooterBooster actua como intermediario y
            no es responsable de la calidad o resultado de los servicios prestados por los tecnicos.
            Los tecnicos deben contar con las habilitaciones pertinentes para operar.
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
