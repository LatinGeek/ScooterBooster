"use client"

import { Button } from "@/components/ui/button"
import type { DayAvailability } from "@/types"

const DAYS: Array<{ key: string; label: string }> = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
]

function createDefaultAvailability(): Record<string, DayAvailability> {
  return Object.fromEntries(
    DAYS.map(({ key }) => [key, { start: "09:00", end: "18:00", isAvailable: key !== "sunday" }]),
  )
}

export function getDefaultAvailability() {
  return createDefaultAvailability()
}

interface Props {
  availability: Record<string, DayAvailability>
  onChange: (next: Record<string, DayAvailability>) => void
  onSave: () => void | Promise<void>
  saving?: boolean
  showSaveButton?: boolean
  error?: string | null
  title?: string
  description?: string
}

export function AvailabilityEditor({
  availability,
  onChange,
  onSave,
  saving = false,
  showSaveButton = true,
  error = null,
  title = "Horarios",
  description = "Configurá la disponibilidad semanal.",
}: Props) {
  function setDay(key: string, patch: Partial<DayAvailability>) {
    onChange({
      ...availability,
      [key]: {
        ...(availability[key] ?? { start: "09:00", end: "18:00", isAvailable: false }),
        ...patch,
      },
    })
  }

  return (
    <section className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
        <p className="mt-1 text-sm text-[#6b7280]">{description}</p>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {DAYS.map(({ key, label }) => {
          const day = availability[key] ?? { start: "09:00", end: "18:00", isAvailable: false }

          return (
            <div
              key={key}
              className="grid gap-3 rounded-xl border border-[#f3f4f6] p-3 lg:grid-cols-[140px_minmax(0,1fr)] lg:items-center"
            >
              <div className="flex items-center justify-between gap-3 lg:justify-start">
                <span className={`text-sm font-medium ${day.isAvailable ? "text-[#111827]" : "text-[#9ca3af]"}`}>
                  {label}
                </span>
                <button
                  type="button"
                  onClick={() => setDay(key, { isAvailable: !day.isAvailable })}
                  className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                    day.isAvailable ? "bg-[#10b981]" : "bg-[#e5e7eb]"
                  }`}
                  aria-pressed={day.isAvailable}
                  aria-label={`${day.isAvailable ? "Desactivar" : "Activar"} ${label}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      day.isAvailable ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="min-w-0">
                {day.isAvailable ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="min-w-0 text-sm text-[#374151]">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                        Desde
                      </span>
                      <input
                        type="time"
                        value={day.start}
                        onChange={(event) => setDay(key, { start: event.target.value })}
                        className="block w-full min-w-0 rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                      />
                    </label>
                    <label className="min-w-0 text-sm text-[#374151]">
                      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[#6b7280]">
                        Hasta
                      </span>
                      <input
                        type="time"
                        value={day.end}
                        onChange={(event) => setDay(key, { end: event.target.value })}
                        className="block w-full min-w-0 rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                      />
                    </label>
                  </div>
                ) : (
                  <span className="text-sm text-[#9ca3af] lg:text-right">No disponible</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showSaveButton ? (
        <div className="mt-6 flex justify-end">
          <Button onClick={() => void onSave()} disabled={saving}>
            {saving ? "Guardando..." : "Guardar horarios"}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
