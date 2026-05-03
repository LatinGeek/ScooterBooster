import type { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getActiveBrands } from "@/lib/db/brands"
import { getActiveModels } from "@/lib/db/models"
import { ScooterCard } from "@/components/scooter-card"
import type { ScooterBrand, ScooterModel } from "@/types"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Catálogo de Scooters — ScooterBooster",
  description:
    "Buscá tu marca y modelo de scooter eléctrico para ver los servicios de modificación y mantenimiento disponibles en Uruguay.",
}

export default async function ScootersPage() {
  const [brands, models] = await Promise.all([getActiveBrands(), getActiveModels()])

  // Group models by brandId
  const modelsByBrand = models.reduce<Record<string, ScooterModel[]>>((acc, model) => {
    const existing = acc[model.brandId] ?? []
    acc[model.brandId] = [...existing, model]
    return acc
  }, {})

  const brandsWithModels = brands.filter((b) => (modelsByBrand[b.id]?.length ?? 0) > 0)

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[#f0fdf4] to-white px-4 py-14 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#111827] md:text-5xl">
          Catálogo de Scooters
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#6b7280]">
          Seleccioná tu marca y modelo para ver los servicios disponibles, precios y técnicos
          compatibles.
        </p>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        {brandsWithModels.length === 0 ? (
          <div className="py-20 text-center text-[#9ca3af]">
            No hay modelos disponibles en este momento.
          </div>
        ) : (
          <div className="space-y-14">
            {brandsWithModels.map((brand: ScooterBrand) => {
              const brandModels = modelsByBrand[brand.id] ?? []
              return (
                <div key={brand.id}>
                  {/* Brand header */}
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[#111827]">{brand.name}</h2>
                    <span className="text-sm text-[#9ca3af]">
                      {brandModels.length} modelo{brandModels.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Model grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {brandModels.map((model) => (
                      <ScooterCard key={model.id} model={model} brandName={brand.name} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="border-t border-[#e5e7eb] bg-[#f9fafb] px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-[#111827]">¿No encontrás tu modelo?</h2>
        <p className="mt-2 text-[#6b7280]">Contactanos y buscamos una solución para tu scooter.</p>
        <Link
          href="/technicians"
          className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[#10b981] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#059669]"
        >
          Ver técnicos disponibles
          <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  )
}
