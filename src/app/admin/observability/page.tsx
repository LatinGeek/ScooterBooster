import Link from "next/link"
import { redirect } from "next/navigation"
import { AlertCircle, BarChart3, CheckCircle2, ExternalLink, HeartPulse, Logs, ShieldAlert } from "lucide-react"
import { adminDb } from "@/lib/firebase-admin"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

type StatusItem = {
  label: string
  value: string
  detail: string
  healthy: boolean
}

function StatusCard({ label, value, detail, healthy }: StatusItem) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        healthy ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/70"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">{label}</p>
          <p className="mt-2 text-xl font-bold text-[#111827]">{value}</p>
          <p className="mt-2 text-sm leading-6 text-[#6b7280]">{detail}</p>
        </div>
        {healthy ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
        )}
      </div>
    </div>
  )
}

export default async function AdminObservabilityPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/observability")
  if (session.role !== "admin") redirect("/")

  let healthDetail = "No pudimos confirmar Firestore desde este request."
  let healthOk = false

  try {
    await adminDb.collection("config").doc("global").get()
    healthOk = true
    healthDetail = "Firestore respondió correctamente al chequeo interno del panel."
  } catch {
    healthDetail = "El chequeo interno a Firestore falló. Revisa credenciales, reglas o disponibilidad del servicio."
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000"
  const sentryEnabled = Boolean(process.env.SENTRY_DSN)
  const sentrySourceMapsReady = Boolean(process.env.SENTRY_DSN && process.env.SENTRY_AUTH_TOKEN)
  const gaEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID)
  const resendEnabled = Boolean(process.env.RESEND_API_KEY)
  const cronEnabled = Boolean(process.env.CRON_SECRET)
  const vercelSignalsEnabled = process.env.VERCEL === "1"
  const logDrainConfigured = Boolean(
    process.env.VERCEL_LOG_DRAIN_URL ||
      process.env.LOGTAIL_SOURCE_TOKEN ||
      process.env.AXIOM_DATASET ||
      process.env.DATADOG_API_KEY,
  )

  const statuses: StatusItem[] = [
    {
      label: "Health check",
      value: healthOk ? "Operativo" : "Atención",
      detail: healthDetail,
      healthy: healthOk,
    },
    {
      label: "Sentry",
      value: sentryEnabled ? "DSN configurado" : "Falta DSN",
      detail: sentrySourceMapsReady
        ? "El build tiene DSN y auth token listos para probar source maps en un entorno real."
        : "Todavía falta cerrar la parte de source maps o el DSN para verificar errores con contexto completo.",
      healthy: sentryEnabled,
    },
    {
      label: "Analytics",
      value: gaEnabled ? "GA4 listo" : "Sin medición",
      detail: gaEnabled
        ? "Los eventos custom quedan detrás del consentimiento de cookies y ya pueden revisarse en desarrollo."
        : "Agregá NEXT_PUBLIC_GA_MEASUREMENT_ID cuando quieras validar embudos reales.",
      healthy: gaEnabled,
    },
    {
      label: "Email y recordatorios",
      value: resendEnabled && cronEnabled ? "Listo para recordatorios" : "Configuración parcial",
      detail:
        resendEnabled && cronEnabled
          ? "El cron diario y los envs de Resend están listos para ejecutar recordatorios automáticos."
          : "Todavía falta completar Resend o CRON_SECRET para cerrar la parte operativa de recordatorios.",
      healthy: resendEnabled && cronEnabled,
    },
    {
      label: "Vercel signals",
      value: vercelSignalsEnabled ? "Analytics activos" : "Solo dev local",
      detail: vercelSignalsEnabled
        ? "Vercel Analytics y Speed Insights se montan automáticamente en despliegues reales."
        : "En local se mantienen apagados a propósito para evitar ruido en pruebas y Playwright.",
      healthy: true,
    },
    {
      label: "Structured logging",
      value: logDrainConfigured ? "Request IDs + log drain" : "Request IDs activos",
      detail: logDrainConfigured
        ? "Cada respuesta API expone `x-request-id` y el entorno ya declara un destino para drenar logs estructurados."
        : "La app ya emite `x-request-id` en respuestas API y pino registra route/method/status/duración; falta conectar un log drain real para cerrar la parte operativa.",
      healthy: true,
    },
  ]

  const quickLinks = [
    {
      href: "/api/health",
      label: "Abrir /api/health",
      description: "Valida rápidamente que el backend puede hablar con Firestore.",
      icon: HeartPulse,
    },
    {
      href: process.env.NODE_ENV === "production" ? "/admin/observability" : "/api/_test/sentry",
      label: process.env.NODE_ENV === "production" ? "Verificar Sentry desde el panel" : "Disparar prueba de Sentry",
      description:
        process.env.NODE_ENV === "production"
          ? "La ruta de prueba queda deshabilitada en producción; usá este panel para revisar la configuración actual."
          : "En desarrollo esta ruta dispara un evento controlado para confirmar que Sentry recibe errores.",
      icon: ShieldAlert,
    },
    {
      href: "/admin/audit",
      label: "Revisar auditoría",
      description: "Cruza eventos operativos con cambios manuales del panel para depurar incidentes.",
      icon: Logs,
    },
    {
      href: "/admin",
      label: "Volver a métricas",
      description: "Combina este estado operativo con el resumen de GMV, reservas y técnicos.",
      icon: BarChart3,
    },
  ]

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Observabilidad</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Estado rápido de salud, analítica, errores y recordatorios para no depender solo de servicios externos.
          </p>
        </div>
        <div className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#6b7280] shadow-sm">
          <p>
            URL base: <span className="font-semibold text-[#111827]">{appUrl}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {statuses.map((status) => (
          <StatusCard key={status.label} {...status} />
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#111827]">Atajos operativos</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          En dev, este panel sirve como checklist vivo para saber qué ya está listo y qué sigue dependiendo de plataforma.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4 transition-colors duration-150 hover:border-amber-300 hover:bg-amber-50"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <link.icon className="h-5 w-5 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[#111827]">{link.label}</p>
                    <ExternalLink className="h-3.5 w-3.5 text-[#9ca3af]" />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#6b7280]">{link.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
