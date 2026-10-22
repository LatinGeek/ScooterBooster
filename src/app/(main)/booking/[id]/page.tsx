import { notFound, redirect } from "next/navigation"
import crypto from "crypto"
import { getSession } from "@/lib/session"
import { getBookingById } from "@/lib/db/bookings"
import { getTechnicianById, getTechnicianByUserId } from "@/lib/db/technicians"
import { getServiceById } from "@/lib/db/services"
import { getModelById } from "@/lib/db/models"
import { getReviewByBooking } from "@/lib/db/reviews"
import { syncMercadoPagoPayment } from "@/lib/mercadopago-payment-sync"
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
  searchParams: Promise<{
    return_status?: string
    status?: string
    payment_id?: string
    collection_id?: string
    guest_token?: string
  }>
}) {
  const { id } = await params
  const { return_status: paymentReturnStatus, status: mercadoPagoStatus, payment_id, collection_id } =
    await searchParams
  const session = await getSession()

  const returnPaymentId = payment_id ?? collection_id

  let booking = await getBookingById(id)
  if (!booking) notFound()

  const role = (session?.["role"] as string | undefined) ?? "guest"

  // Access control
  let hasAccess = false
  const guestToken = (await searchParams).guest_token
  const guestTokenHash = guestToken ? crypto.createHash("sha256").update(guestToken).digest("hex") : null
  if (!session && booking.guestAccessTokenHash && guestTokenHash && crypto.timingSafeEqual(Buffer.from(booking.guestAccessTokenHash), Buffer.from(guestTokenHash))) {
    hasAccess = true
  } else if (!session) {
    redirect("/login?redirect=/booking")
  } else if (role === "admin") {
    hasAccess = true
  } else if (role === "technician") {
    const techProfile = await getTechnicianByUserId(session.uid)
    hasAccess = techProfile?.id === booking.technicianId
  } else {
    hasAccess = booking.userId === session.uid
  }

  if (!hasAccess) notFound()

  if (
    returnPaymentId &&
    (paymentReturnStatus === "success" || mercadoPagoStatus === "approved") &&
    booking.paymentStatus !== "paid"
  ) {
    try {
      const syncResult = await syncMercadoPagoPayment({
        paymentId: returnPaymentId,
        expectedBookingId: booking.id,
      })

      if (syncResult.result === "processed") {
        const refreshedBooking = await getBookingById(id)
        if (refreshedBooking) booking = refreshedBooking
      }
    } catch {
      // Let the page render the current booking state; the client keeps polling as fallback.
    }
  }

  // Fetch related entities in parallel
  const [technician, service, scooterModel, existingReview] = await Promise.all([
    getTechnicianById(booking.technicianId),
    getServiceById(booking.serviceId),
    getModelById(booking.scooterModelId),
    booking.status === "completed" ? getReviewByBooking(id) : Promise.resolve(null),
  ])
  const { guestAccessTokenHash: _guestAccessTokenHash, ...bookingForClient } = booking

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BookingDetailClient
        booking={bookingForClient}
        technician={technician}
        service={service}
        scooterModel={scooterModel}
        role={role}
        userId={session?.uid ?? ""}
        paymentReturnStatus={paymentReturnStatus}
        hasReview={!!existingReview}
      />
    </main>
  )
}
