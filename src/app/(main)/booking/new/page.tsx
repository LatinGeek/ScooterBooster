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
    <main className="bg-[#f3f4f6]">
      <section className="relative overflow-hidden bg-[#020c0a] text-white">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,rgba(2,12,10,0)_0%,#f3f4f6_100%)]" />

        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-14 sm:px-6 sm:pt-14 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold tracking-[0.22em] text-[#34d399] uppercase">
              Reserva guiada
            </p>
            <h1 className="mt-3 text-4xl leading-[0.98] font-black text-white sm:text-5xl">
              Elegí scooter, servicio y técnico sin vueltas.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">
              Armamos el turno paso a paso con precios claros, disponibilidad del técnico y seña
              online para confirmar.
            </p>
          </div>
        </div>
      </section>

      <section className="relative mx-auto -mt-8 max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">
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
    <div className="animate-pulse rounded-[1.75rem] border border-[#dbe4ea] bg-white p-4 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.45)] sm:p-6">
      <div className="mb-5 h-20 rounded-2xl bg-[#e5e7eb]" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="h-80 rounded-2xl bg-[#e5e7eb]" />
        <div className="hidden h-80 rounded-2xl bg-[#e5e7eb] lg:block" />
      </div>
    </div>
  )
}
