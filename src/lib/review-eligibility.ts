import type { Booking } from "@/types"

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function isBookingOverdueForUserReview(booking: Pick<Booking, "scheduledDate" | "status" | "paymentStatus">, now = new Date()) {
  if (booking.paymentStatus !== "paid") return false
  if (booking.status !== "confirmed" && booking.status !== "in_progress") return false

  const scheduledAt = new Date(booking.scheduledDate).getTime()
  if (Number.isNaN(scheduledAt)) return false

  return now.getTime() - scheduledAt >= ONE_DAY_MS
}

export function canUserReviewBooking(booking: Pick<Booking, "scheduledDate" | "status" | "paymentStatus">, now = new Date()) {
  return booking.status === "completed" || isBookingOverdueForUserReview(booking, now)
}
