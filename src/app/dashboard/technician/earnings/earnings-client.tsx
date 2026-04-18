"use client"

import { DollarSign, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Booking, Service, ScooterModel } from "@/types"

interface Props {
  bookings: Booking[]
  services: Record<string, Service>
  models: Record<string, ScooterModel>
  totalEarnings: number
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-UY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function EarningsClient({ bookings, services, models, totalEarnings }: Props) {
  function exportCSV() {
    const header = "Fecha,Servicio,Scooter,Precio base (UYU)"
    const rows = bookings.map((b) => {
      const date = formatDate(b.scheduledDate)
      const service = services[b.serviceId]?.name ?? b.serviceId
      const model = models[b.scooterModelId]?.name ?? b.scooterModelId
      return `"${date}","${service}","${model}",${b.basePrice}`
    })
    const csv = [header, ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ganancias-scooterbooster-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Ganancias</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Historial de servicios completados. Estos son tus ingresos antes de impuestos.
          </p>
        </div>
        {bookings.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-1.5 h-4 w-4" />
            Exportar CSV
          </Button>
        )}
      </div>

      {/* Summary card */}
      <div className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d1fae5]">
            <DollarSign className="h-6 w-6 text-[#059669]" />
          </div>
          <div>
            <p className="text-3xl font-bold text-[#111827]">{formatPrice(totalEarnings)}</p>
            <p className="text-sm text-[#6b7280]">
              Total acumulado · {bookings.length} servicio{bookings.length !== 1 ? "s" : ""}{" "}
              completado{bookings.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white py-16 text-center">
          <DollarSign className="mb-4 h-10 w-10 text-[#d1d5db]" />
          <p className="text-sm text-[#9ca3af]">
            Aún no tenés servicios completados. ¡Acá verás tus ganancias!
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-[#f3f4f6] bg-[#fafafa]">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Fecha
                </th>
                <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280] sm:table-cell">
                  Servicio
                </th>
                <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6b7280] md:table-cell">
                  Scooter
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  Ganancia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-[#fafafa]">
                  <td className="px-5 py-3 text-[#374151]">{formatDate(b.scheduledDate)}</td>
                  <td className="hidden px-5 py-3 text-[#374151] sm:table-cell">
                    {services[b.serviceId]?.name ?? "—"}
                  </td>
                  <td className="hidden px-5 py-3 text-[#374151] md:table-cell">
                    {models[b.scooterModelId]?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-[#059669]">
                    {formatPrice(b.basePrice)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-[#e5e7eb] bg-[#fafafa]">
              <tr>
                <td
                  colSpan={3}
                  className="px-5 py-3 text-sm font-semibold text-[#374151]"
                >
                  Total
                </td>
                <td className="px-5 py-3 text-right text-base font-bold text-[#059669]">
                  {formatPrice(totalEarnings)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  )
}
