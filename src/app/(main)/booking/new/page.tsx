import { Suspense } from "react"
import { BookingWizard } from "./booking-wizard"
import { getActiveModels } from "@/lib/db/models"
import { getActiveServices } from "@/lib/db/services"
import { getActiveTechnicians } from "@/lib/db/technicians"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Nueva Reserva | ScooterBooster",
  description: "Reservá un servicio para tu scooter eléctrico en ScooterBooster.",
}

export default async function NewBookingPage() {
  const [models, services, technicians] = await Promise.all([
    getActiveModels(),
    getActiveServices(),
    getActiveTechnicians(),
  ])
  const modelsWithImages = models.filter((model) => Boolean(model.imageURL))

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#111827]">Nueva Reserva</h1>
        <p className="mt-1 text-[#6b7280]">
          Completá los pasos para reservar un servicio para tu scooter.
        </p>
      </div>
      <Suspense fallback={<WizardSkeleton />}>
        <BookingWizard models={modelsWithImages} services={services} technicians={technicians} />
      </Suspense>
    </main>
  )
}

function WizardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 w-48 rounded bg-[#e5e7eb]" />
      <div className="h-64 rounded-xl bg-[#e5e7eb]" />
    </div>
  )
}
