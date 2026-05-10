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
    try {
      const consent = readCookiePreferences()
      setVisible(!consent)
    } catch {
      setVisible(true)
    }
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
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-3xl text-sm text-[#374151]">
          Usamos cookies esenciales para mantener tu sesion segura. Si aceptas analitica, tambien
          activamos medicion basica para entender altas, reservas y mejoras de producto. Podes leer
          mas en nuestra{" "}
          <Link href="/legal/privacy" className="font-medium text-[#10b981] hover:underline">
            Politica de privacidad
          </Link>{" "}
          y la{" "}
          <Link href="/legal/cookies" className="font-medium text-[#10b981] hover:underline">
            Politica de cookies
          </Link>
          .
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => savePreferences(false)}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#d1d5db] bg-white px-4 py-2 text-sm font-semibold text-[#374151] transition-colors hover:bg-[#f9fafb]"
          >
            Solo esenciales
          </button>
          <button
            type="button"
            onClick={() => savePreferences(true)}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#059669]"
          >
            Aceptar analitica
          </button>
        </div>
      </div>
    </div>
  )
}
