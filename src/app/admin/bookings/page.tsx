import { redirect } from "next/navigation"
import { getAllBookings } from "@/lib/db/bookings"
import { getModelById } from "@/lib/db/models"
import { getServiceById } from "@/lib/db/services"
import { getTechnicianById } from "@/lib/db/technicians"
import { getUsersByIds } from "@/lib/db/users"
import { getSession } from "@/lib/session"
import { AdminBookingsClient } from "./bookings-client"

export const dynamic = "force-dynamic"

export default async function AdminBookingsPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/bookings")
  if (session.role !== "admin") redirect("/")

  const bookings = await getAllBookings()
  const users = await getUsersByIds(bookings.map((booking) => booking.userId))
  const technicians = Object.fromEntries(
    await Promise.all(
      [...new Set(bookings.map((booking) => booking.technicianId))].map(async (technicianId) => [
        technicianId,
        await getTechnicianById(technicianId),
      ]),
    ),
  )
  const services = Object.fromEntries(
    await Promise.all(
      [...new Set(bookings.map((booking) => booking.serviceId))].map(async (serviceId) => [
        serviceId,
        await getServiceById(serviceId),
      ]),
    ),
  )
  const models = Object.fromEntries(
    await Promise.all(
      [...new Set(bookings.map((booking) => booking.scooterModelId))].map(async (modelId) => [
        modelId,
        await getModelById(modelId),
      ]),
    ),
  )

  return (
    <AdminBookingsClient
      bookings={bookings}
      users={users}
      technicians={technicians}
      services={services}
      models={models}
    />
  )
}
