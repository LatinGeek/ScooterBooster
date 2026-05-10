"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { AdminOverviewCharts } from "@/app/admin/overview-charts"
import type { AdminOverviewSnapshot } from "@/lib/admin-overview"

interface Props {
  initialData: AdminOverviewSnapshot
  endpoint?: string
  intervalMs?: number
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value)
}

export function AdminOverviewLive({ initialData, endpoint = "/api/admin/overview", intervalMs = 15000 }: Props) {
  const [data, setData] = useState(initialData)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    const abortController = new AbortController()

    const sync = async () => {
      if (document.hidden) return

      try {
        const response = await fetch(endpoint, {
          signal: abortController.signal,
          headers: {
            Accept: "application/json",
          },
        })

        if (!response.ok) return

        const payload = (await response.json()) as {
          success?: boolean
          data?: AdminOverviewSnapshot
        }

        if (!cancelled && payload.success && payload.data) {
          setData(payload.data)
          setLastUpdatedAt(new Date())
        }
      } catch {
        // Keep the last good payload visible if the live poll fails.
      }
    }

    void sync()
    const intervalId = window.setInterval(() => {
      void sync()
    }, intervalMs)

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void sync()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      cancelled = true
      abortController.abort()
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [endpoint, intervalMs])

  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
        <RefreshCw className="h-3.5 w-3.5" />
        <span>Datos en vivo</span>
        <span className="hidden text-emerald-600 sm:inline">se sincronizan automáticamente</span>
      </div>
      {lastUpdatedAt ? (
        <p className="text-[11px] text-[#6b7280]">Última actualización: {formatTime(lastUpdatedAt)}</p>
      ) : (
        <p className="text-[11px] text-[#6b7280]">Cargando datos en vivo desde el backend.</p>
      )}
      <AdminOverviewCharts
        trends={data.trends}
        bookingStatusCounts={data.bookingStatusCounts}
        totalGMV={data.totalGMV}
        totalPlatformRevenue={data.totalPlatformRevenue}
      />
    </div>
  )
}
