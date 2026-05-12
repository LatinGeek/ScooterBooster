"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  createCookiePreferences,
  readCookiePreferences,
  writeCookiePreferences,
} from "@/lib/analytics"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const consent = readCookiePreferences()
        setVisible(!consent)
      } catch {
        setVisible(true)
      }
    })
  }, [])

  function savePreferences(analytics: boolean) {
    try {
      writeCookiePreferences(createCookiePreferences(analytics))
    } catch {
      // Ignore storage failures and just hide the banner for the current session.
    }

    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#d1d5db] bg-white/96 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-4">
        <div className="max-w-3xl text-xs leading-5 text-[#374151] sm:text-sm sm:leading-6">
          <span className="sm:hidden">
            Usamos cookies esenciales y analitica opcional para mejorar reservas.
          </span>
          <span className="hidden sm:inline">
            Usamos cookies esenciales para mantener tu sesion segura. Si aceptas analitica, tambien
            activamos medicion basica para entender altas, reservas y mejoras de producto.
          </span>{" "}
          Podes leer mas en nuestra{" "}
          <Link href="/legal/privacy" className="font-medium text-[#10b981] hover:underline">
            Politica de privacidad
          </Link>{" "}
          y la{" "}
          <Link href="/legal/cookies" className="font-medium text-[#10b981] hover:underline">
            Politica de cookies
          </Link>
          .
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
          <button
            type="button"
            onClick={() => savePreferences(false)}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-3 py-2 text-xs font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb] sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Esenciales</span>
            <span className="hidden sm:inline">Solo esenciales</span>
          </button>
          <button
            type="button"
            onClick={() => savePreferences(true)}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg bg-[#10b981] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#059669] sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Aceptar</span>
            <span className="hidden sm:inline">Aceptar analitica</span>
          </button>
        </div>
      </div>
    </div>
  )
}
