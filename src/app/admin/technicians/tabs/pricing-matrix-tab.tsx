"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PricingMatrixGrid } from "@/components/pricing-matrix-grid"
import type { ScooterBrand, ScooterModel, Service, Technician } from "@/types"

interface Props {
  technician: Technician
  services: Service[]
  models: ScooterModel[]
  brands: ScooterBrand[]
  onSave: (matrix: Technician["pricingMatrix"]) => Promise<void>
  saving?: boolean
}

export function PricingMatrixTab({
  technician,
  services,
  models,
  brands,
  onSave,
  saving = false,
}: Props) {
  const [matrix, setMatrix] = useState<Technician["pricingMatrix"]>(technician.pricingMatrix ?? {})
  const dirty = useMemo(
    () => JSON.stringify(matrix ?? {}) !== JSON.stringify(technician.pricingMatrix ?? {}),
    [matrix, technician.pricingMatrix],
  )

  useEffect(() => {
    setMatrix(technician.pricingMatrix ?? {})
  }, [technician])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#111827]">Servicios & precios</h3>
          <p className="text-sm text-[#6b7280]">La matriz controla el catálogo público y la reserva.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              Hay cambios sin guardar
            </span>
          ) : null}
          <Button onClick={() => void onSave(matrix)} disabled={saving || !dirty}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar matriz"
            )}
          </Button>
        </div>
      </div>

      <PricingMatrixGrid services={services} models={models} brands={brands} matrix={matrix} onChange={setMatrix} />
      {dirty ? (
        <div className="flex items-center gap-2 rounded-xl border border-[#d1fae5] bg-[#f0fdf4] px-4 py-3 text-sm text-[#047857]">
          <CheckCircle className="h-4 w-4" />
          Hay cambios pendientes.
        </div>
      ) : null}
    </div>
  )
}
