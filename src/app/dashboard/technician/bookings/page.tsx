import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getBookingsByTechnician } from "@/lib/db/bookings"
import { adminDb } from "@/lib/firebase-admin"
import type { Booking, Service, ScooterModel } from "@/types"
import { TechnicianBookingsClient } from "./bookings-client"

export const dynamic = "force-dynamic"

async function fetchRelated(bookings: Booking[]) {
  const serviceIds = [...new Set(bookings.map((b) => b.serviceId))]
  const modelIds = [...new Set(bookings.map((b) => b.scooterModelId))]

  const [serviceSnaps, modelSnaps] = await Promise.all([
    serviceIds.length
      ? Promise.all(serviceIds.map((id) => adminDb.collection("services").doc(id).get()))
      : Promise.resolve([]),
    modelIds.length
      ? Promise.all(modelIds.map((id) => adminDb.collection("scooterModels").doc(id).get()))
      : Promise.resolve([]),
  ])

  const services: Record<string, Service> = {}
  for (const snap of serviceSnaps) {
    if (snap.exists) {
      const data = snap.data() ?? {}
      services[snap.id] = {
        id: snap.id,
        ...data,
        createdAt:
          typeof data["createdAt"] === "string"
            ? data["createdAt"]
            : data["createdAt"]?.toDate?.().toISOString() ?? "",
      } as unknown as Service
    }
  }

  const models: Record<string, ScooterModel> = {}
  for (const snap of modelSnaps) {
    if (snap.exists) {
      const data = snap.data() ?? {}
      models[snap.id] = {
        id: snap.id,
        ...data,
        createdAt:
          typeof data["createdAt"] === "string"
            ? data["createdAt"]
            : data["createdAt"]?.toDate?.().toISOString() ?? "",
      } as unknown as ScooterModel
    }
  }

  return { services, models }
}

export default async function TechnicianBookingsPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician/bookings")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) redirect("/onboarding")

  const bookings = await getBookingsByTechnician(tech.id)
  const { services, models } = await fetchRelated(bookings)

  return (
    <TechnicianBookingsClient
      initialBookings={bookings}
      services={services}
      models={models}
      technicianId={tech.id}
    />
  )
}
