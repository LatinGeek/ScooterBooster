import { redirect } from "next/navigation"
import { getModelById } from "@/lib/db/models"
import { getServiceById } from "@/lib/db/services"
import { getSession } from "@/lib/session"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getBookingsByTechnician } from "@/lib/db/bookings"
import { getUsersByIds } from "@/lib/db/users"
import type { Booking, Service, ScooterModel, User } from "@/types"
import lazyLoad from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const TechnicianBookingsClient = lazyLoad(
  () => import("./bookings-client").then((m) => m.TechnicianBookingsClient),
  { loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
)

export const dynamic = "force-dynamic"

async function fetchRelated(bookings: Booking[]) {
  const serviceIds = [...new Set(bookings.map((b) => b.serviceId))]
  const modelIds = [...new Set(bookings.map((b) => b.scooterModelId))]
  const userIds = [...new Set(bookings.map((b) => b.userId))]

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

  const users = await getUsersByIds(userIds)

  return { services, models, users }
}

export default async function TechnicianBookingsPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician/bookings")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) redirect("/onboarding")

  const bookings = await getBookingsByTechnician(tech.id)
  const { services, models, users } = await fetchRelated(bookings)

  return (
    <TechnicianBookingsClient
      initialBookings={bookings}
      services={services}
      models={models}
      users={users as Record<string, User>}
      technicianId={tech.id}
    />
  )
}
