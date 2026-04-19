"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Let Sentry capture the error in production
    if (process.env.NODE_ENV === "production") {
      console.error("[GlobalError]", error)
    }
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>

      <p className="text-sm font-semibold uppercase tracking-widest text-red-500">Error 500</p>
      <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
        Algo salió mal
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-gray-500">
        Ocurrió un error inesperado. Ya fuimos notificados. Podés intentar de nuevo o volver al
        inicio.
      </p>

      {error.digest && (
        <p className="mt-2 font-mono text-xs text-gray-400">Ref: {error.digest}</p>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-md shadow-emerald-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-400"
        >
          <RefreshCw className="h-4 w-4" />
          Intentar de nuevo
        </button>
        <Link
          href="/"
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md"
        >
          <Home className="h-4 w-4" />
          Ir al inicio
        </Link>
      </div>
    </main>
  )
}
