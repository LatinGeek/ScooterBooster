"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ScooterBrand, ScooterModel, Service, Technician, TechnicianModelPricing } from "@/types"

function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(amount)
}

function normalizeEntry(entry?: TechnicianModelPricing): TechnicianModelPricing {
  return {
    price: entry?.price ?? 0,
    currency: "UYU",
    isAvailable: entry?.isAvailable ?? false,
  }
}

interface Props {
  services: Service[]
  models: ScooterModel[]
  brands: ScooterBrand[]
  matrix: Technician["pricingMatrix"]
  onChange: (next: Technician["pricingMatrix"]) => void
}

export function PricingMatrixGrid({ services, models, brands, matrix, onChange }: Props) {
  const [bulkPrices, setBulkPrices] = useState<Record<string, string>>({})

  const modelsByBrand = useMemo(() => {
    return models.reduce<Record<string, ScooterModel[]>>((acc, model) => {
      const list = acc[model.brandId] ?? []
      acc[model.brandId] = [...list, model]
      return acc
    }, {})
  }, [models])

  const brandOrder = useMemo(
    () => brands.filter((brand) => (modelsByBrand[brand.id]?.length ?? 0) > 0),
    [brands, modelsByBrand],
  )

  function setCell(serviceId: string, modelId: string, entry: TechnicianModelPricing) {
    onChange({
      ...(matrix ?? {}),
      [serviceId]: {
        ...((matrix ?? {})[serviceId] ?? {}),
        [modelId]: entry,
      },
    })
  }

  function setRowAvailability(serviceId: string, isAvailable: boolean) {
    const nextRow: Record<string, TechnicianModelPricing> = {}
    for (const model of models) {
      const current = normalizeEntry(matrix?.[serviceId]?.[model.id])
      nextRow[model.id] = {
        ...current,
        isAvailable: model.compatibleServices.includes(serviceId) ? isAvailable : false,
      }
    }

    onChange({ ...(matrix ?? {}), [serviceId]: nextRow })
  }

  function copyPriceToRow(serviceId: string) {
    const raw = bulkPrices[serviceId]?.trim()
    const price = Number(raw)
    if (!Number.isFinite(price) || price < 0) return

    const nextRow: Record<string, TechnicianModelPricing> = {}
    for (const model of models) {
      const current = normalizeEntry(matrix?.[serviceId]?.[model.id])
      nextRow[model.id] = {
        ...current,
        isAvailable: model.compatibleServices.includes(serviceId),
        price: model.compatibleServices.includes(serviceId) ? price : 0,
      }
    }

    onChange({ ...(matrix ?? {}), [serviceId]: nextRow })
  }

  return (
    <div className="space-y-6">
      {services.map((service) => {
        const row = matrix?.[service.id] ?? {}

        return (
          <section key={service.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-[#111827]">{service.name}</h3>
                  {service.requiresDisclaimer ? (
                    <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
                      Aviso legal
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">{service.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={50}
                  value={bulkPrices[service.id] ?? ""}
                  onChange={(event) =>
                    setBulkPrices((current) => ({ ...current, [service.id]: event.target.value }))
                  }
                  placeholder="Precio fila"
                  className="w-32"
                />
                <Button variant="outline" size="sm" onClick={() => setRowAvailability(service.id, true)}>
                  Seleccionar todo
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRowAvailability(service.id, false)}>
                  Limpiar todo
                </Button>
                <Button size="sm" onClick={() => copyPriceToRow(service.id)}>
                  Copiar precio a fila
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {brandOrder.map((brand) => {
                const brandModels = modelsByBrand[brand.id] ?? []

                return (
                  <div key={brand.id} className="rounded-xl border border-[#f3f4f6]">
                    <div className="border-b border-[#f3f4f6] bg-[#fafafa] px-4 py-2 text-sm font-medium text-[#374151]">
                      {brand.name}
                    </div>
                    <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {brandModels.map((model) => {
                        const entry = normalizeEntry(row[model.id])
                        const compatible = model.compatibleServices.includes(service.id)
                        const disabled = !compatible

                        return (
                          <div
                            key={model.id}
                            className={`rounded-xl border p-3 transition-colors ${
                              disabled ? "border-dashed border-[#e5e7eb] bg-[#fafafa] opacity-70" : "border-[#e5e7eb]"
                            }`}
                          >
                            <div className="mb-2">
                              <p className="text-sm font-medium text-[#111827]">{model.name}</p>
                              <p className="text-xs text-[#6b7280]">
                                {disabled ? "No compatible con este servicio" : "Compatible"}
                              </p>
                            </div>

                            <label className="flex items-center gap-2 text-xs font-medium text-[#374151]">
                              <input
                                type="checkbox"
                                checked={entry.isAvailable}
                                disabled={disabled}
                                onChange={(event) =>
                                  setCell(service.id, model.id, {
                                    ...entry,
                                    isAvailable: event.target.checked,
                                  })
                                }
                              />
                              Disponible
                            </label>

                            {entry.isAvailable ? (
                              <div className="mt-3">
                                <label className="mb-1 block text-xs font-medium text-[#374151]">
                                  Precio
                                </label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={50}
                                  value={entry.price}
                                  onChange={(event) =>
                                    setCell(service.id, model.id, {
                                      ...entry,
                                      price: Number(event.target.value || 0),
                                    })
                                  }
                                  disabled={disabled}
                                />
                              </div>
                            ) : null}

                            {entry.isAvailable ? (
                              <p className="mt-2 text-xs text-[#059669]">
                                Desde {formatPrice(entry.price)}
                              </p>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
