"use client"

import { useMemo, useState } from "react"
import { CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PricingMatrixGrid } from "@/components/pricing-matrix-grid"
import type { ScooterBrand, ScooterModel, Service, Technician } from "@/types"

interface Props {
  tech: Technician
  services: Service[]
  models: ScooterModel[]
  brands: ScooterBrand[]
}

export function PricingClient({ tech, services, models, brands }: Props) {
  const [matrix, setMatrix] = useState<Technician["pricingMatrix"]>(tech.pricingMatrix ?? {})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = useMemo(
    () => JSON.stringify(matrix ?? {}) !== JSON.stringify(tech.pricingMatrix ?? {}),
    [matrix, tech.pricingMatrix],
  )

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch("/api/technicians/me/pricing-matrix", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingMatrix: matrix ?? {} }),
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(payload.error ?? "No pudimos guardar los precios.")
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
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Servicios y precios</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
            Editá la matriz servicio x modelo. Los cambios se aplican al catálogo y a la reserva.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Hay cambios sin guardar
            </span>
          ) : null}
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#a7f3d0] bg-[#d1fae5] px-4 py-3 text-sm text-[#065f46]">
          <CheckCircle className="h-4 w-4" />
          Guardado correctamente.
        </div>
      ) : null}

      <PricingMatrixGrid services={services} models={models} brands={brands} matrix={matrix} onChange={setMatrix} />
    </section>
  )
}
