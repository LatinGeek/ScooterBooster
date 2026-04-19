import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description: "Política de privacidad y tratamiento de datos personales de ScooterBooster (Ley 18.331).",
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link
        href="/legal"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#111827]"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Legal
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-[#111827]">Política de Privacidad</h1>
      <p className="mb-8 text-sm text-[#9ca3af]">Última actualización: abril 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-[#374151]">
        <section>
          <h2 className="text-lg font-semibold text-[#111827]">1. Marco Legal</h2>
          <p>
            ScooterBooster cumple con la Ley N° 18.331 de Protección de Datos Personales de Uruguay
            y su Decreto Reglamentario N° 414/009. Tus datos personales son tratados con las
            medidas de seguridad apropiadas.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">2. Datos que Recopilamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Datos de registro:</strong> nombre, email y foto de perfil (desde Google
              OAuth).
            </li>
            <li>
              <strong>Datos de contacto:</strong> número de teléfono (opcional, proporcionado por
              el usuario).
            </li>
            <li>
              <strong>Datos de uso:</strong> reservas, pagos, reseñas, interacciones con la
              plataforma.
            </li>
            <li>
              <strong>Datos técnicos:</strong> dirección IP, tipo de dispositivo, logs de acceso
              (solo para seguridad).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">3. Finalidad del Tratamiento</h2>
          <p>Utilizamos tus datos para:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Gestionar tu cuenta y acceso a la plataforma.</li>
            <li>Procesar reservas y pagos.</li>
            <li>Conectarte con técnicos disponibles.</li>
            <li>Enviarte notificaciones sobre tus reservas (previo consentimiento para WhatsApp).</li>
            <li>Mejorar nuestros servicios mediante análisis agregados.</li>
            <li>Cumplir con obligaciones legales y fiscales.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">4. Compartición de Datos</h2>
          <p>
            No vendemos tus datos personales. Compartimos información únicamente con:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Técnicos:</strong> tu nombre y número de contacto para coordinar el servicio
              contratado.
            </li>
            <li>
              <strong>MercadoPago:</strong> datos necesarios para procesar pagos, bajo sus propias
              políticas de privacidad.
            </li>
            <li>
              <strong>Firebase (Google):</strong> proveedor de infraestructura para almacenamiento
              y autenticación.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">5. Tus Derechos (Ley 18.331)</h2>
          <p>Tenés derecho a:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Acceso:</strong> solicitar copia de tus datos personales.
            </li>
            <li>
              <strong>Rectificación:</strong> corregir datos incorrectos o desactualizados.
            </li>
            <li>
              <strong>Eliminación:</strong> solicitar la eliminación de tu cuenta y datos (desde
              Perfil → Zona de peligro, o escribiendo a privacidad@scooterbooster.uy).
            </li>
            <li>
              <strong>Oposición:</strong> oponerte al tratamiento para fines de marketing.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">6. Retención de Datos</h2>
          <p>
            Conservamos tus datos mientras tu cuenta esté activa o sea necesario para cumplir con
            obligaciones legales. Al eliminar tu cuenta, los datos son desactivados de inmediato y
            eliminados de forma permanente dentro de los 30 días.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">7. Seguridad</h2>
          <p>
            Implementamos medidas de seguridad técnicas y organizativas: cifrado en tránsito
            (HTTPS/TLS), autenticación con Firebase, control de acceso basado en roles, y logs de
            auditoría. Ningún sistema es 100% seguro; notificamos brechas conforme a la normativa.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">8. Cookies</h2>
          <p>
            Usamos cookies estrictamente necesarias para la autenticación (sesión segura). No
            usamos cookies de rastreo publicitario de terceros. Más detalle en nuestra{" "}
            <Link href="/legal/cookies" className="text-[#10b981] hover:underline">
              Política de cookies
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#111827]">9. Contacto</h2>
          <p>
            Para ejercer tus derechos o consultas sobre privacidad, contactá a{" "}
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
