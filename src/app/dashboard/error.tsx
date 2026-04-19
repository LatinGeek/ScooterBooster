"use client"

import { RefreshCw, LayoutDashboard } from "lucide-react"
import Link from "next/link"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error: _error, reset }: ErrorProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-red-500">Error</p>
      <h2 className="mt-2 text-2xl font-bold text-gray-900">Error al cargar el panel</h2>
      <p className="mx-auto mt-3 max-w-sm text-gray-500">
        No pudimos cargar tu panel. Intentá de nuevo o volvé al inicio.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={reset}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-400"
        >
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </button>
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:border-gray-300"
        >
          <LayoutDashboard className="h-4 w-4" />
          Inicio
        </Link>
      </div>
    </div>
  )
}
