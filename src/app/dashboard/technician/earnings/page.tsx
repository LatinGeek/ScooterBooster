import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getBookingsByTechnician } from "@/lib/db/bookings"
import { adminDb } from "@/lib/firebase-admin"
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
      ? Promise.all(serviceIds.map((id) => adminDb.collection("services").doc(id).get()))
      : Promise.resolve([]),
    modelIds.length
      ? Promise.all(modelIds.map((id) => adminDb.collection("scooterModels").doc(id).get()))
      : Promise.resolve([]),
  ])

  const services: Record<string, Service> = {}
  for (const snap of serviceSnaps) {
    if (snap.exists) services[snap.id] = { id: snap.id, ...snap.data() } as unknown as Service
  }

  const models: Record<string, ScooterModel> = {}
  for (const snap of modelSnaps) {
    if (snap.exists) models[snap.id] = { id: snap.id, ...snap.data() } as unknown as ScooterModel
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
