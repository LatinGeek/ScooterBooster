"use client"

import { useState, useEffect } from "react"
import { CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DayAvailability, Technician } from "@/types"

const DAYS: { key: string; label: string }[] = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
]

const DEFAULT_AVAILABILITY: Record<string, DayAvailability> = Object.fromEntries(
  DAYS.map(({ key }) => [key, { start: "09:00", end: "18:00", isAvailable: key !== "sunday" }]),
)

export default function AvailabilityPage() {
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>(DEFAULT_AVAILABILITY)
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/technicians/me")
      .then((r) => r.json())
      .then((json: { data?: Technician }) => {
        if (json.data) {
          if (Object.keys(json.data.availability).length > 0) {
            setAvailability(json.data.availability)
          }
          setIsActive(json.data.isActive)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggleDay(key: string) {
    setAvailability((prev) => ({
      ...prev,
      [key]: { ...prev[key]!, isAvailable: !prev[key]!.isAvailable },
    }))
  }

  function updateTime(key: string, field: "start" | "end", value: string) {
    setAvailability((prev) => ({
      ...prev,
      [key]: { ...prev[key]!, [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/technicians/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability, isActive }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? "Error al guardar.")
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Error de conexión.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#10b981]" />
      </div>
    )
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Disponibilidad</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Configurá tus horarios de atención semanales.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#a7f3d0] bg-[#d1fae5] px-4 py-3 text-sm text-[#065f46]">
          <CheckCircle className="h-4 w-4" />
          Disponibilidad guardada correctamente.
        </div>
      )}

      {/* Vacation mode */}
      <div className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[#111827]">Modo vacaciones</p>
            <p className="mt-0.5 text-sm text-[#6b7280]">
              Cuando está activo, aparecés en el catálogo y recibís reservas.
            </p>
          </div>
          <button
            onClick={() => setIsActive((v) => !v)}
            className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200 ${
              isActive ? "bg-[#10b981]" : "bg-[#e5e7eb]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        <p className="mt-2 text-xs font-medium text-[#6b7280]">
          Estado actual:{" "}
          <span className={isActive ? "text-[#059669]" : "text-red-500"}>
            {isActive ? "Activo — visible en catálogo" : "En pausa — no visible"}
          </span>
        </p>
      </div>

      {/* Weekly schedule */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-[#111827]">Horario semanal</h2>
        <div className="flex flex-col gap-3">
          {DAYS.map(({ key, label }) => {
            const day = availability[key] ?? { start: "09:00", end: "18:00", isAvailable: false }
            return (
              <div key={key} className="flex flex-wrap items-center gap-3">
                {/* Toggle */}
                <button
                  onClick={() => toggleDay(key)}
                  className={`relative h-5 w-9 cursor-pointer rounded-full transition-colors duration-200 ${
                    day.isAvailable ? "bg-[#10b981]" : "bg-[#e5e7eb]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      day.isAvailable ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>

                <span
                  className={`w-24 text-sm font-medium ${
                    day.isAvailable ? "text-[#111827]" : "text-[#9ca3af]"
                  }`}
                >
                  {label}
                </span>

                {day.isAvailable && (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={day.start}
                      onChange={(e) => updateTime(key, "start", e.target.value)}
                      className="rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-sm text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    />
                    <span className="text-sm text-[#6b7280]">a</span>
                    <input
                      type="time"
                      value={day.end}
                      onChange={(e) => updateTime(key, "end", e.target.value)}
                      className="rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-sm text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                    />
                  </div>
                )}

                {!day.isAvailable && (
                  <span className="text-sm text-[#9ca3af]">No disponible</span>
                )}
              </div>
            )
          })}
        </div>

        <Button onClick={() => void handleSave()} disabled={saving} className="mt-6">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar disponibilidad"
          )}
        </Button>
      </div>
    </section>
  )
}
