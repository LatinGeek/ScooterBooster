"use client"

import { useEffect, useState } from "react"
import { CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AvailabilityEditor, getDefaultAvailability } from "@/components/availability-editor"
import type { DayAvailability, Technician } from "@/types"

interface Props {
  technician: Technician
  onSave: (availability: Record<string, DayAvailability>) => Promise<void>
  saving?: boolean
}

export function AvailabilityTab({ technician, onSave, saving = false }: Props) {
  const [availability, setAvailability] = useState<Record<string, DayAvailability>>(
    Object.keys(technician.availability ?? {}).length > 0
      ? technician.availability
      : getDefaultAvailability(),
  )
  const dirty = JSON.stringify(availability ?? {}) !== JSON.stringify(technician.availability ?? {})

  useEffect(() => {
    setAvailability(
      Object.keys(technician.availability ?? {}).length > 0
        ? technician.availability
        : getDefaultAvailability(),
    )
  }, [technician])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#111827]">Horarios</h3>
          <p className="text-sm text-[#6b7280]">Los horarios se usan para mostrar disponibilidad en reservas.</p>
        </div>
        <Button onClick={() => void onSave(availability)} disabled={saving || !dirty}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar horarios"
          )}
        </Button>
      </div>

      <AvailabilityEditor
        availability={availability}
        onChange={setAvailability}
        onSave={() => void onSave(availability)}
        saving={saving}
        title="Horario semanal"
        description="Definí la franja por día. Desactivá un día para bloquear reservas."
      />

      {dirty ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#d1fae5] bg-[#f0fdf4] px-4 py-3 text-sm text-[#047857]">
          <CheckCircle className="h-4 w-4" />
          Hay cambios pendientes.
        </div>
      ) : null}
    </div>
  )
}
