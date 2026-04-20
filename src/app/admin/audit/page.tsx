import { redirect } from "next/navigation"
import { getAuditEntries } from "@/lib/db/audit-log"
import { getUsersByIds } from "@/lib/db/users"
import { getSession } from "@/lib/session"
import type { AuditLogEntry } from "@/types"
import { Activity, Filter } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    action?: string
    actor?: string
    target?: string
  }>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("es-UY", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function prettyAction(action: string) {
  return action
    .split("_")
    .filter(Boolean)
    .map((token) => token[0]?.toUpperCase() + token.slice(1))
    .join(" ")
}

function entrySummary(entry: AuditLogEntry) {
  switch (entry.action) {
    case "booking_created":
      return "Se creó una nueva reserva."
    case "booking_status_updated":
      return "Se actualizó el estado de una reserva."
    case "booking_reminder_sent":
      return "Se envió un recordatorio de reserva."
    case "payment_webhook_processed":
      return "Mercado Pago notificó un cambio de pago."
    case "technician_application_submitted":
      return "Se recibió una nueva postulación técnica."
    case "technician_approved":
      return "Se aprobó un perfil técnico."
    case "technician_rejected":
      return "Se rechazó un perfil técnico."
    case "disclaimer_accepted":
      return "El usuario aceptó el aviso legal del servicio."
    default:
      return "Evento registrado en el historial de auditoría."
  }
}

function FilterInput({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string
  label: string
  defaultValue?: string
  placeholder: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[#374151]">
      <span className="font-medium">{label}</span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-10 rounded-xl border border-[#d1d5db] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-emerald-400"
      />
    </label>
  )
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/audit")
  if (session.role !== "admin") redirect("/")

  const filters = await searchParams
  const entries = await getAuditEntries({
    action: filters.action?.trim() || undefined,
    actorUid: filters.actor?.trim() || undefined,
    targetType: filters.target?.trim() || undefined,
    limit: 200,
  })

  const actorIds = entries.map((entry) => entry.actorUid).filter((value): value is string => Boolean(value))
  const users = await getUsersByIds(actorIds)

  return (
    <section>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Auditoría</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Trazabilidad de reservas, pagos, moderación y automatizaciones.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
          <Activity className="h-5 w-5 text-[#2563eb]" />
        </div>
      </div>

      <form className="mb-6 grid gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm md:grid-cols-4">
        <FilterInput
          name="action"
          label="Acción"
          defaultValue={filters.action}
          placeholder="booking_created"
        />
        <FilterInput
          name="actor"
          label="Actor UID"
          defaultValue={filters.actor}
          placeholder="admin-uid"
        />
        <FilterInput
          name="target"
          label="Tipo de objetivo"
          defaultValue={filters.target}
          placeholder="booking, technician..."
        />
        <div className="flex items-end gap-2">
          <button className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white transition hover:bg-[#1f2937]">
            <Filter className="h-4 w-4" />
            Filtrar
          </button>
          <a
            href="/admin/audit"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#e5e7eb] px-4 text-sm font-medium text-[#6b7280] transition hover:bg-[#f9fafb] hover:text-[#111827]"
          >
            Limpiar
          </a>
        </div>
      </form>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-sm text-[#6b7280]">No encontramos eventos con esos filtros.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const actor = entry.actorUid ? users[entry.actorUid] : null

            return (
              <article key={entry.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-xs font-semibold text-[#2563eb]">
                        {prettyAction(entry.action)}
                      </span>
                      <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs font-medium text-[#6b7280]">
                        {entry.targetType}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-[#111827]">{entrySummary(entry)}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">
                      {actor?.displayName || entry.actorUid || "Sistema"} · {formatDate(entry.createdAt)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-[#6b7280]">
                    <p>ID evento: {entry.id}</p>
                    <p>Objetivo: {entry.targetId ?? "—"}</p>
                  </div>
                </div>

                {Object.keys(entry.metadata).length > 0 ? (
                  <pre className="mt-4 overflow-x-auto rounded-2xl bg-[#0f172a] p-4 text-xs leading-6 text-slate-200">
                    {JSON.stringify(entry.metadata, null, 2)}
                  </pre>
                ) : null}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
