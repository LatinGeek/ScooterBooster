import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getBookingsByUser } from "@/lib/db/bookings"
import { getModelById } from "@/lib/db/models"
import { getServiceById } from "@/lib/db/services"
import { getTechnicianById } from "@/lib/db/technicians"
import type { Booking, Service, Technician, ScooterModel } from "@/types"
import lazyLoad from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const DashboardBookingsClient = lazyLoad(
  () => import("./dashboard-bookings-client").then((m) => m.DashboardBookingsClient),
  { loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
)

export const dynamic = "force-dynamic"

// ─── Server-side data fetching ────────────────────────────────────────────────

async function fetchRelated(bookings: Booking[]) {
  const technicianIds = [...new Set(bookings.map((b) => b.technicianId))]
  const serviceIds = [...new Set(bookings.map((b) => b.serviceId))]
  const modelIds = [...new Set(bookings.map((b) => b.scooterModelId))]

  const [techSnaps, serviceSnaps, modelSnaps] = await Promise.all([
    technicianIds.length
      ? Promise.all(technicianIds.map((id) => getTechnicianById(id)))
      : Promise.resolve([]),
    serviceIds.length
      ? Promise.all(serviceIds.map((id) => getServiceById(id)))
      : Promise.resolve([]),
    modelIds.length
      ? Promise.all(modelIds.map((id) => getModelById(id)))
      : Promise.resolve([]),
  ])

  const technicians: Record<string, Technician> = {}
  for (const technician of techSnaps) {
    if (technician) {
      technicians[technician.id] = technician
    }
  }

  const services: Record<string, Service> = {}
  for (const service of serviceSnaps) {
    if (service) {
      services[service.id] = service
    }
  }

  const models: Record<string, ScooterModel> = {}
  for (const model of modelSnaps) {
    if (model) {
      models[model.id] = model
    }
  }

  return { technicians, services, models }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard")

  const bookings = await getBookingsByUser(session.uid)
  const { technicians, services, models } = await fetchRelated(bookings)

  return (
    <DashboardBookingsClient
      initialBookings={bookings}
      technicians={technicians}
      services={services}
      models={models}
      userId={session.uid}
    />
  )
}
