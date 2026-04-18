import type { Booking, Service } from "@/types"

type BookingActorRole = "user" | "technician" | "admin"

const ALLOWED_TRANSITIONS: Record<BookingActorRole, Partial<Record<Booking["status"], Booking["status"][]>>> =
  {
    user: {
      pending: ["cancelled_by_user"],
    },
    technician: {
      pending: ["confirmed", "cancelled_by_technician"],
      confirmed: ["in_progress"],
      in_progress: ["completed"],
    },
    admin: {
      pending: ["confirmed", "cancelled_by_user", "cancelled_by_technician", "expired"],
      confirmed: ["in_progress", "cancelled_by_user", "cancelled_by_technician"],
      in_progress: ["completed", "cancelled_by_technician"],
    },
  }

export function requiresBookingDisclaimer(
  service: Pick<Service, "requiresDisclaimer"> | null | undefined
) {
  return Boolean(service?.requiresDisclaimer)
}

export function canTransitionBookingStatus(
  role: BookingActorRole,
  currentStatus: Booking["status"],
  nextStatus: Booking["status"]
) {
  return (ALLOWED_TRANSITIONS[role][currentStatus] ?? []).includes(nextStatus)
}

export function canUserCancelBooking(booking: Pick<Booking, "scheduledDate">, now = new Date()) {
  const scheduledAt = new Date(booking.scheduledDate)
  const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60)
  return hoursUntil >= 0
}
