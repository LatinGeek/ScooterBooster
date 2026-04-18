import { notFound, redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getBookingById } from "@/lib/db/bookings"
import { getTechnicianById, getTechnicianByUserId } from "@/lib/db/technicians"
import { getServiceById } from "@/lib/db/services"
import { getModelById } from "@/lib/db/models"
import { BookingDetailClient } from "./booking-detail-client"

export const dynamic = "force-dynamic"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return {
    title: `Reserva #${id.slice(0, 8)} | ScooterBooster`,
  }
}

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string }>
}) {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/booking")

  const { id } = await params
  const { status: paymentStatus } = await searchParams

  const booking = await getBookingById(id)
  if (!booking) notFound()

  const role = (session["role"] as string | undefined) ?? "user"

  // Access control
  let hasAccess = false
  if (role === "admin") {
    hasAccess = true
  } else if (role === "technician") {
    const techProfile = await getTechnicianByUserId(session.uid)
    hasAccess = techProfile?.id === booking.technicianId
  } else {
    hasAccess = booking.userId === session.uid
  }

  if (!hasAccess) notFound()

  // Fetch related entities
  const [technician, service, scooterModel] = await Promise.all([
    getTechnicianById(booking.technicianId),
    getServiceById(booking.serviceId),
    getModelById(booking.scooterModelId),
  ])

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BookingDetailClient
        booking={booking}
        technician={technician}
        service={service}
        scooterModel={scooterModel}
        role={role}
        userId={session.uid}
        paymentReturnStatus={paymentStatus}
      />
    </main>
  )
}
