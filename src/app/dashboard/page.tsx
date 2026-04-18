import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getBookingsByUser } from "@/lib/db/bookings"
import { adminDb } from "@/lib/firebase-admin"
import type { Booking, Service, Technician, ScooterModel } from "@/types"
import { DashboardBookingsClient } from "./dashboard-bookings-client"

export const dynamic = "force-dynamic"

// ─── Server-side data fetching ────────────────────────────────────────────────

async function fetchRelated(bookings: Booking[]) {
  const technicianIds = [...new Set(bookings.map((b) => b.technicianId))]
  const serviceIds = [...new Set(bookings.map((b) => b.serviceId))]
  const modelIds = [...new Set(bookings.map((b) => b.scooterModelId))]

  const [techSnaps, serviceSnaps, modelSnaps] = await Promise.all([
    technicianIds.length
      ? Promise.all(
          technicianIds.map((id) => adminDb.collection("technicians").doc(id).get()),
        )
      : Promise.resolve([]),
    serviceIds.length
      ? Promise.all(serviceIds.map((id) => adminDb.collection("services").doc(id).get()))
      : Promise.resolve([]),
    modelIds.length
      ? Promise.all(modelIds.map((id) => adminDb.collection("scooterModels").doc(id).get()))
      : Promise.resolve([]),
  ])

  const technicians: Record<string, Technician> = {}
  for (const snap of techSnaps) {
    if (snap.exists) {
      technicians[snap.id] = { id: snap.id, ...snap.data() } as unknown as Technician
    }
  }

  const services: Record<string, Service> = {}
  for (const snap of serviceSnaps) {
    if (snap.exists) {
      services[snap.id] = { id: snap.id, ...snap.data() } as unknown as Service
    }
  }

  const models: Record<string, ScooterModel> = {}
  for (const snap of modelSnaps) {
    if (snap.exists) {
      models[snap.id] = { id: snap.id, ...snap.data() } as unknown as ScooterModel
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
