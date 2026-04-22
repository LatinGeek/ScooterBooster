import { redirect } from "next/navigation"
import { getModelById } from "@/lib/db/models"
import { getServiceById } from "@/lib/db/services"
import { getSession } from "@/lib/session"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getBookingsByTechnician } from "@/lib/db/bookings"
import type { Service, ScooterModel } from "@/types"
import lazyLoad from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const EarningsClient = lazyLoad(
  () => import("./earnings-client").then((m) => m.EarningsClient),
  { loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
)

export const dynamic = "force-dynamic"

export default async function EarningsPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician/earnings")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) redirect("/onboarding")

  const allBookings = await getBookingsByTechnician(tech.id)
  const completed = allBookings.filter((b) => b.status === "completed")

  const serviceIds = [...new Set(completed.map((b) => b.serviceId))]
  const modelIds = [...new Set(completed.map((b) => b.scooterModelId))]

  const [serviceSnaps, modelSnaps] = await Promise.all([
    serviceIds.length
      ? Promise.all(serviceIds.map((id) => getServiceById(id)))
      : Promise.resolve([]),
    modelIds.length
      ? Promise.all(modelIds.map((id) => getModelById(id)))
      : Promise.resolve([]),
  ])

  const services: Record<string, Service> = {}
  for (const service of serviceSnaps) {
    if (service) services[service.id] = service
  }

  const models: Record<string, ScooterModel> = {}
  for (const model of modelSnaps) {
    if (model) models[model.id] = model
  }

  const totalEarnings = completed.reduce((sum, b) => sum + b.basePrice, 0)

  return (
    <EarningsClient
      bookings={completed}
      services={services}
      models={models}
      totalEarnings={totalEarnings}
    />
  )
}
