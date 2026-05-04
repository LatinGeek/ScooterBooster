"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
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
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({})
  const [expandedBrands, setExpandedBrands] = useState<Record<string, Record<string, boolean>>>({})
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({})

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

  useEffect(() => {
    const firstServiceWithActive =
      services.find((service) =>
        models.some((model) => matrix?.[service.id]?.[model.id]?.isAvailable),
      )?.id ?? services[0]?.id

    setExpandedServices((current) => {
      const next = { ...current }
      for (const service of services) {
        if (next[service.id] === undefined) {
          next[service.id] = service.id === firstServiceWithActive
        }
      }
      return next
    })

    setExpandedBrands((current) => {
      const next = { ...current }
      for (const service of services) {
        const serviceMap = { ...(next[service.id] ?? {}) }
        const compatibleBrands = brandOrder.filter((brand) =>
          (modelsByBrand[brand.id] ?? []).some((model) => model.compatibleServices.includes(service.id)),
        )
        const firstBrandWithActive =
          compatibleBrands.find((brand) =>
            (modelsByBrand[brand.id] ?? []).some((model) => matrix?.[service.id]?.[model.id]?.isAvailable),
          )?.id ?? compatibleBrands[0]?.id

        for (const brand of compatibleBrands) {
          if (serviceMap[brand.id] === undefined) {
            serviceMap[brand.id] =
              (modelsByBrand[brand.id] ?? []).some((model) => matrix?.[service.id]?.[model.id]?.isAvailable) ||
              brand.id === firstBrandWithActive
          }
        }

        next[service.id] = serviceMap
      }
      return next
    })
  }, [brandOrder, matrix, models, modelsByBrand, services])

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

  function toggleService(serviceId: string) {
    setExpandedServices((current) => ({ ...current, [serviceId]: !current[serviceId] }))
  }

  function toggleBrand(serviceId: string, brandId: string) {
    setExpandedBrands((current) => ({
      ...current,
      [serviceId]: {
        ...(current[serviceId] ?? {}),
        [brandId]: !(current[serviceId] ?? {})[brandId],
      },
    }))
  }

  return (
    <div className="space-y-4">
      {services.map((service) => {
        const row = matrix?.[service.id] ?? {}
        const compatibleBrands = brandOrder.filter((brand) =>
          (modelsByBrand[brand.id] ?? []).some((model) => model.compatibleServices.includes(service.id)),
        )
        const activeCount = compatibleBrands.reduce(
          (sum, brand) =>
            sum +
            (modelsByBrand[brand.id] ?? []).filter(
              (model) => model.compatibleServices.includes(service.id) && row[model.id]?.isAvailable,
            ).length,
          0,
        )
        const activePrices = compatibleBrands.flatMap((brand) =>
          (modelsByBrand[brand.id] ?? [])
            .filter((model) => model.compatibleServices.includes(service.id) && row[model.id]?.isAvailable)
            .map((model) => row[model.id]?.price ?? 0),
        )
        const expanded = expandedServices[service.id] ?? false
        const descriptionExpanded = expandedDescriptions[service.id] ?? false

        return (
          <section key={service.id} className="rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
            <button
              type="button"
              onClick={() => toggleService(service.id)}
              className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-[#111827]">{service.name}</h3>
                  {service.requiresDisclaimer ? (
                    <Badge variant="warning" className="px-2 py-0.5 text-[10px]">
                      Aviso legal
                    </Badge>
                  ) : null}
                  <span className="rounded-full bg-[#f3f4f6] px-2 py-0.5 text-[11px] font-medium text-[#6b7280]">
                    {activeCount} modelos activos
                  </span>
                  {activePrices.length > 0 ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      Desde {formatPrice(Math.min(...activePrices))}
                    </span>
                  ) : null}
                </div>
                <p
                  className={`mt-1 max-w-2xl text-sm text-[#6b7280] ${
                    descriptionExpanded ? "" : "line-clamp-2"
                  }`}
                >
                  {service.description}
                </p>
                <span
                  onClick={(event) => {
                    event.stopPropagation()
                    setExpandedDescriptions((current) => ({
                      ...current,
                      [service.id]: !current[service.id],
                    }))
                  }}
                  className="mt-1 inline-block cursor-pointer text-xs font-medium text-[#10b981]"
                >
                  {descriptionExpanded ? "Ver menos" : "Ver más"}
                </span>
              </div>

              <div className="pt-1 text-[#6b7280]">
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </button>

            {expanded ? (
              <div className="border-t border-[#f3f4f6] px-5 py-4">
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#f8fafc] p-3">
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    value={bulkPrices[service.id] ?? ""}
                    onChange={(event) =>
                      setBulkPrices((current) => ({ ...current, [service.id]: event.target.value }))
                    }
                    placeholder="Precio fila"
                    className="w-32 bg-white"
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

                <div className="space-y-3">
                  {compatibleBrands.map((brand) => {
                    const brandModels = (modelsByBrand[brand.id] ?? []).filter((model) =>
                      model.compatibleServices.includes(service.id),
                    )
                    const brandExpanded = expandedBrands[service.id]?.[brand.id] ?? false
                    const activeInBrand = brandModels.filter((model) => row[model.id]?.isAvailable).length

                    return (
                      <div key={brand.id} className="rounded-xl border border-[#f3f4f6]">
                        <button
                          type="button"
                          onClick={() => toggleBrand(service.id, brand.id)}
                          className="flex w-full items-center justify-between gap-3 bg-[#fafafa] px-4 py-2.5 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#374151]">{brand.name}</span>
                            <span className="text-xs text-[#9ca3af]">
                              {activeInBrand}/{brandModels.length} activos
                            </span>
                          </div>
                          {brandExpanded ? (
                            <ChevronDown className="h-4 w-4 text-[#6b7280]" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-[#6b7280]" />
                          )}
                        </button>

                        {brandExpanded ? (
                          <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
                            {brandModels.map((model) => {
                              const entry = normalizeEntry(row[model.id])

                              return (
                                <div key={model.id} className="rounded-xl border border-[#e5e7eb] bg-white p-3">
                                  <div className="mb-2 flex items-start justify-between gap-3">
                                    <p className="text-sm font-medium leading-tight text-[#111827]">{model.name}</p>
                                    <label className="flex items-center gap-2 text-xs font-medium text-[#374151]">
                                      <input
                                        type="checkbox"
                                        checked={entry.isAvailable}
                                        onChange={(event) =>
                                          setCell(service.id, model.id, {
                                            ...entry,
                                            isAvailable: event.target.checked,
                                          })
                                        }
                                      />
                                      Disponible
                                    </label>
                                  </div>

                                  {entry.isAvailable ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-[#6b7280]">$</span>
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
                                        className="h-9"
                                      />
                                      <span className="text-xs font-medium text-emerald-700">
                                        {formatPrice(entry.price)}
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-[#9ca3af]">Sin disponibilidad para este modelo.</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
