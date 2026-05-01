"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Bell } from "lucide-react"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import type { Booking, BookingStatus } from "@/types"
import { cn } from "@/lib/utils"

interface NotificationBellProps {
  href?: string
  className?: string
}

const UPCOMING_STATUSES: BookingStatus[] = ["pending", "confirmed", "in_progress"]

function normalizeBookingDoc(id: string, data: Record<string, unknown>): Booking {
  return {
    id,
    userId: (data["userId"] as string) ?? "",
    technicianId: (data["technicianId"] as string) ?? "",
    serviceId: (data["serviceId"] as string) ?? "",
    scooterModelId: (data["scooterModelId"] as string) ?? "",
    status: (data["status"] as BookingStatus) ?? "pending",
    scheduledDate: (data["scheduledDate"] as string) ?? "",
    notes: (data["notes"] as string | null | undefined) ?? null,
    basePrice: (data["basePrice"] as number) ?? 0,
    serviceFee: (data["serviceFee"] as number) ?? 0,
    totalPrice: (data["totalPrice"] as number) ?? 0,
    paymentStatus: (data["paymentStatus"] as Booking["paymentStatus"]) ?? "pending",
    paymentId: (data["paymentId"] as string | null | undefined) ?? null,
    paymentLinkId: (data["paymentLinkId"] as string | null | undefined) ?? null,
    paymentLinkUrl: (data["paymentLinkUrl"] as string | null | undefined) ?? null,
    disclaimerAccepted: Boolean(data["disclaimerAccepted"]),
    disclaimerAcceptedAt: (data["disclaimerAcceptedAt"] as string | null | undefined) ?? null,
    disclaimerVersion: (data["disclaimerVersion"] as string | null | undefined) ?? null,
    refundedAt: (data["refundedAt"] as string | null | undefined) ?? null,
    reminderSentAt: (data["reminderSentAt"] as string | null | undefined) ?? null,
    createdAt:
      typeof data["createdAt"] === "string" ? data["createdAt"] : new Date().toISOString(),
    updatedAt:
      typeof data["updatedAt"] === "string" ? data["updatedAt"] : new Date().toISOString(),
  }
}

function isUpcomingBooking(booking: Booking): boolean {
  if (!UPCOMING_STATUSES.includes(booking.status)) return false

  const scheduledAt = new Date(booking.scheduledDate).getTime()
  if (Number.isNaN(scheduledAt)) return false

  return scheduledAt >= Date.now()
}

export function NotificationBell({
  href = "/dashboard/notifications",
  className,
}: NotificationBellProps) {
  const { user, role } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    if (!user || role !== "user") return

    const db = getFirebaseDb()
    const bookingsQuery = query(collection(db, "bookings"), where("userId", "==", user.uid))

    return onSnapshot(bookingsQuery, (snapshot) => {
      setBookings(
        snapshot.docs.map((doc) =>
          normalizeBookingDoc(doc.id, doc.data() as Record<string, unknown>),
        ),
      )
    })
  }, [role, user])

  const upcomingCount = useMemo(() => bookings.filter(isUpcomingBooking).length, [bookings])

  if (!user || role !== "user") return null

  return (
    <Link
      href={href}
      aria-label={
        upcomingCount > 0
          ? `Abrir notificaciones (${upcomingCount} reservas próximas)`
          : "Abrir notificaciones"
      }
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors duration-200 hover:border-[#10b981] hover:text-[#059669]",
        className,
      )}
    >
      <Bell className="h-4 w-4" />
      {upcomingCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#10b981] px-1 text-[10px] font-bold leading-none text-white">
          {upcomingCount > 9 ? "9+" : upcomingCount}
        </span>
      ) : null}
    </Link>
  )
}
