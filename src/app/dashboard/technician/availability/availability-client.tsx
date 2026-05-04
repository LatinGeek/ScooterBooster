"use client"

import { useState } from "react"
import { CheckCircle } from "lucide-react"
import { AvailabilityEditor, getDefaultAvailability } from "@/components/availability-editor"
import type { DayAvailability, Technician } from "@/types"

interface Props {
  tech: Technician
}

export function AvailabilityClient({ tech }: Props) {
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>(
    Object.keys(tech.availability ?? {}).length > 0 ? tech.availability : getDefaultAvailability(),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch("/api/technicians/me/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availability }),
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(payload.error ?? "No pudimos guardar los horarios.")
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

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Disponibilidad</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
          Configurá tus horarios de atención semanales y mantenelos sincronizados con las reservas.
        </p>
      </div>

      {saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#a7f3d0] bg-[#d1fae5] px-4 py-3 text-sm text-[#065f46]">
          <CheckCircle className="h-4 w-4" />
          Disponibilidad guardada correctamente.
        </div>
      ) : null}

      <AvailabilityEditor
        availability={availability}
        onChange={setAvailability}
        onSave={handleSave}
        saving={saving}
        error={error}
        title="Horario semanal"
        description="Activá cada día y definí la franja horaria disponible."
      />
    </section>
  )
}
