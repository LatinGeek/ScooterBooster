"use client"

import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

interface AdminLiveDataRefreshProps {
  className?: string
  intervalMs?: number
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value)
}

export function AdminLiveDataRefresh({ className, intervalMs = 30000 }: AdminLiveDataRefreshProps) {
  const router = useRouter()
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)

  useEffect(() => {
    const sync = () => {
      if (document.hidden) return
      router.refresh()
      setLastSyncAt(new Date())
    }

    const intervalId = window.setInterval(sync, intervalMs)

    const handleVisibilityChange = () => {
      if (!document.hidden) sync()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [intervalMs, router])

  return (
    <div className={className} aria-label="Actualización automática de datos">
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
        <RefreshCw className="h-3.5 w-3.5" />
        <span>Datos en vivo</span>
        <span className="hidden text-emerald-600 sm:inline">se refrescan cada 30 s</span>
      </div>
      {lastSyncAt ? (
        <p className="mt-1 text-[11px] text-[#6b7280]">Última sincronización: {formatTime(lastSyncAt)}</p>
      ) : (
        <p className="mt-1 text-[11px] text-[#6b7280]">
          Sincronización automática activa mientras la pestaña esté abierta.
        </p>
      )}
    </div>
  )
}
