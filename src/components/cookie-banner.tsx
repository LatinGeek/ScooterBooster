"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

const COOKIE_CONSENT_KEY = "sb-cookie-consent"

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const consent = window.localStorage.getItem(COOKIE_CONSENT_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(consent !== "accepted")
    } catch {
      setVisible(true)
    }
  }, [])

  function acceptCookies() {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, "accepted")
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
          Usamos cookies esenciales para mantener tu sesión segura y analítica básica para mejorar
          la experiencia. Podés leer más en nuestra{" "}
          <Link href="/legal/privacy" className="font-medium text-[#10b981] hover:underline">
            Política de privacidad
          </Link>{" "}
          y la{" "}
          <Link href="/legal/cookies" className="font-medium text-[#10b981] hover:underline">
            Política de cookies
          </Link>
          .
        </div>

        <button
          type="button"
          onClick={acceptCookies}
          className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#10b981] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#059669]"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
