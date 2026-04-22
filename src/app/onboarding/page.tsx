"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bike } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { trackAnalyticsEvent } from "@/lib/analytics"

const PHONE_REGEX = /^\+598\d{8}$/

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [fullName, setFullName] = useState(user?.displayName ?? "")
  const [phone, setPhone] = useState("")
  const [whatsappConsent, setWhatsappConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({})
  const [apiError, setApiError] = useState<string | null>(null)

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#10b981] border-t-transparent" />
      </main>
    )
  }

  if (user?.phone) {
    router.replace("/")
    return null
  }

  function validate() {
    const newErrors: typeof errors = {}
    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = "El nombre debe tener al menos 2 caracteres."
    }
    if (!PHONE_REGEX.test(phone)) {
      newErrors.phone = "El telefono debe tener formato +598XXXXXXXX (ej: +59899123456)."
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!validate()) return

    setSaving(true)
    setApiError(null)

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: fullName.trim(),
          phone,
          whatsappConsent,
        }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        setApiError(data.error ?? "Error al guardar el perfil. Intenta de nuevo.")
        return
      }

      trackAnalyticsEvent("signup_completed", {
        has_whatsapp_consent: whatsappConsent,
      })
      router.replace("/")
    } catch {
      setApiError("Error de conexion. Intenta de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f9fafb] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#10b981]">
            <Bike className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[#111827]">Completa tu perfil</h1>
            <p className="mt-1 text-sm text-[#6b7280]">Solo un par de datos mas para empezar</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5e7eb] bg-white px-8 py-10 shadow-sm">
          {apiError ? (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-[#374151]">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ej: Juan Garcia"
                autoComplete="name"
                className={[
                  "rounded-lg border px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af]",
                  "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
                  errors.fullName
                    ? "border-red-500 focus:ring-red-500"
                    : "border-[#e5e7eb] focus:border-[#10b981] focus:ring-[#10b981]",
                ].join(" ")}
              />
              {errors.fullName ? <p className="text-xs text-red-600">{errors.fullName}</p> : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-[#374151]">
                Telefono (Uruguay) <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+59899123456"
                autoComplete="tel"
                className={[
                  "rounded-lg border px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af]",
                  "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
                  errors.phone
                    ? "border-red-500 focus:ring-red-500"
                    : "border-[#e5e7eb] focus:border-[#10b981] focus:ring-[#10b981]",
                ].join(" ")}
              />
              {errors.phone ? <p className="text-xs text-red-600">{errors.phone}</p> : null}
              <p className="text-xs text-[#9ca3af]">Inclui el codigo de pais: +598</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(event) => setWhatsappConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[#e5e7eb] accent-[#10b981]"
              />
              <span className="text-sm text-[#374151]">
                Acepto recibir notificaciones por WhatsApp sobre mis reservas
              </span>
            </label>

            <Button type="submit" disabled={saving} className="mt-2 w-full">
              {saving ? "Guardando..." : "Continuar"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
