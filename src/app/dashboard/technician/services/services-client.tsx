"use client"

import { useState } from "react"
import { CheckCircle, Loader2, Wrench, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Service, ScooterBrand, Technician } from "@/types"

interface Props {
  tech: Technician
  allServices: Service[]
  allBrands: ScooterBrand[]
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n)
}

export function TechnicianServicesClient({ tech, allServices, allBrands }: Props) {
  const [selectedServices, setSelectedServices] = useState<string[]>(tech.services)
  const [pricing, setPricing] = useState<Record<string, number>>(
    Object.fromEntries(
      Object.entries(tech.pricing).map(([k, v]) => [k, v.basePrice]),
    ),
  )
  const [selectedBrands, setSelectedBrands] = useState<string[]>(tech.supportedBrands)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function toggleBrand(id: string) {
    setSelectedBrands((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    )
  }

  function updatePrice(serviceId: string, value: string) {
    const num = parseInt(value.replace(/\D/g, ""), 10)
    if (!isNaN(num)) {
      setPricing((prev) => ({ ...prev, [serviceId]: num }))
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const pricingPayload: Record<string, { basePrice: number; currency: "UYU" }> = {}
    for (const sId of selectedServices) {
      pricingPayload[sId] = { basePrice: pricing[sId] ?? 500, currency: "UYU" }
    }

    try {
      const res = await fetch("/api/technicians/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: selectedServices,
          supportedBrands: selectedBrands,
          pricing: pricingPayload,
        }),
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

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Servicios y precios</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Seleccioná qué servicios ofrecés y fijá tus precios base.
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
          Guardado correctamente.
        </div>
      )}

      {/* Services */}
      <div className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-semibold text-[#111827]">Servicios ofrecidos</h2>
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-[#f0fdf4] px-3 py-2 text-xs text-[#065f46]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            La plataforma agrega un 10% de comisión sobre el precio base. El cliente paga precio
            base + comisión.
          </span>
        </div>
        <div className="flex flex-col gap-4">
          {allServices.map((service) => {
            const isSelected = selectedServices.includes(service.id)
            const currentPrice = pricing[service.id] ?? 500
            return (
              <div
                key={service.id}
                className={`rounded-xl border p-4 transition-colors duration-150 ${
                  isSelected ? "border-[#10b981] bg-[#f0fdf4]" : "border-[#e5e7eb] bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleService(service.id)}
                    className={`mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-2 transition-colors duration-150 ${
                      isSelected
                        ? "border-[#10b981] bg-[#10b981]"
                        : "border-[#d1d5db] bg-white"
                    }`}
                  >
                    {isSelected && (
                      <svg viewBox="0 0 12 12" fill="none" className="h-full w-full p-0.5">
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="white"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="font-medium text-[#111827]">{service.name}</p>
                    <p className="mt-0.5 text-sm text-[#6b7280]">{service.description}</p>

                    {isSelected && (
                      <div className="mt-3 flex items-center gap-3">
                        <label className="text-sm font-medium text-[#374151]">Precio base:</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9ca3af]">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={currentPrice}
                            onChange={(e) => updatePrice(service.id, e.target.value)}
                            className="rounded-lg border border-[#e5e7eb] py-1.5 pl-6 pr-3 text-sm text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
                          />
                        </div>
                        <span className="text-xs text-[#6b7280]">
                          → cliente paga {formatPrice(Math.round(currentPrice * 1.1))}
                        </span>
                      </div>
                    )}
                  </div>
                  <Wrench className={`h-4 w-4 shrink-0 mt-0.5 ${isSelected ? "text-[#10b981]" : "text-[#9ca3af]"}`} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Brands */}
      <div className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-[#111827]">Marcas que atendés</h2>
        <div className="flex flex-wrap gap-2">
          {allBrands.map((brand) => {
            const isSelected = selectedBrands.includes(brand.id)
            return (
              <button
                key={brand.id}
                onClick={() => toggleBrand(brand.id)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                  isSelected
                    ? "border-[#10b981] bg-[#d1fae5] text-[#059669]"
                    : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#10b981]"
                }`}
              >
                {brand.name}
              </button>
            )
          })}
        </div>
      </div>

      <Button onClick={() => void handleSave()} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Guardando…
          </>
        ) : (
          "Guardar cambios"
        )}
      </Button>
    </section>
  )
}
