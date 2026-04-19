"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-6">
        <main className="w-full max-w-lg rounded-2xl border border-[#e5e7eb] bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold tracking-[0.16em] text-[#10b981] uppercase">
            ScooterBooster
          </p>
          <h1 className="mt-3 text-2xl font-bold text-[#111827]">Algo salió mal</h1>
          <p className="mt-3 text-sm text-[#6b7280]">
            Ya registramos el error para revisarlo. Probá recargar la página en unos segundos.
          </p>
        </main>
      </body>
    </html>
  )
}
