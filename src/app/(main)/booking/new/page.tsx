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
      <section className="relative overflow-hidden bg-[#07110f] px-4 py-8 text-white sm:px-6 sm:py-12 lg:px-8">
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(16,185,129,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#10b981]/30 bg-[#10b981]/10 px-3 py-1.5 text-[11px] font-bold text-[#6ee7b7] uppercase sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" aria-hidden="true" />
            Reserva guiada
          </div>
          <h1 className="mt-4 text-2xl leading-tight font-black text-white sm:text-3xl md:text-4xl">
            Reservá tu servicio.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9ca3af] sm:text-base sm:leading-7">
            Elegí el scooter, el servicio, un técnico verificado y el horario. La seña online
            confirma el turno.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
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
    <div className="animate-pulse sm:rounded-2xl sm:border sm:border-[#dbe4ea] sm:bg-white sm:p-5 sm:shadow-sm">
      <div className="mb-4 h-20 rounded-2xl border border-[#dbe4ea] bg-white shadow-sm sm:shadow-none" />
      <div className="h-72 rounded-2xl bg-[#e5e7eb] sm:bg-[#f3f4f6]" />
      <div className="mt-4 h-20 rounded-2xl border border-[#dbe4ea] bg-white sm:hidden" />
    </div>
  )
}
