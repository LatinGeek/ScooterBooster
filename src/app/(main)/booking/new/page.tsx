import { Suspense } from "react"
import { BookingWizard } from "./booking-wizard"
import { getActiveBrands } from "@/lib/db/brands"
import { getPlatformSettings } from "@/lib/db/platform-settings"
import { getActiveModels } from "@/lib/db/models"
import { getActiveServices } from "@/lib/db/services"
import { getActiveTechnicians } from "@/lib/db/technicians"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Nueva Reserva | ScooterBooster",
  description: "Reservá un servicio para tu scooter eléctrico en ScooterBooster.",
}

export default async function NewBookingPage() {
  const [brands, models, services, technicians, platformSettings] = await Promise.all([
    getActiveBrands(),
    getActiveModels(),
    getActiveServices(),
    getActiveTechnicians(),
    getPlatformSettings(),
  ])
  const visibleBrandIds = new Set(models.map((model) => model.brandId))
  const brandsWithModels = brands.filter((brand) => visibleBrandIds.has(brand.id))

  return (
    <main className="bg-[#f6f8f7]">
      <section className="border-b border-[#e5e7eb] bg-white">
        <div className="mx-auto max-w-4xl px-4 pt-8 pb-6 sm:px-6 sm:pt-10 lg:px-8">
          <p className="text-xs font-bold tracking-[0.2em] text-[#10b981] uppercase">
            Reserva guiada
          </p>
          <h1 className="mt-3 text-3xl leading-tight font-black text-[#111827] sm:text-4xl">
            Reservá tu servicio.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4b5563] sm:text-base">
            Elegí el scooter, el servicio, un técnico verificado y el horario. La seña online
            confirma el turno.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Suspense fallback={<WizardSkeleton />}>
          <BookingWizard
            brands={brandsWithModels}
            models={models}
            services={services}
            technicians={technicians}
            serviceFeeAmount={platformSettings.serviceFeeAmount}
          />
        </Suspense>
      </section>
    </main>
  )
}

function WizardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[#dbe4ea] bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 h-16 rounded-2xl bg-[#e5e7eb]" />
      <div className="h-80 rounded-2xl bg-[#e5e7eb]" />
    </div>
  )
}
