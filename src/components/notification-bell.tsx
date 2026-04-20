"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Bell } from "lucide-react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import { useAuth } from "@/hooks/use-auth"
import type { AppNotification } from "@/types"
import { cn } from "@/lib/utils"

interface NotificationBellProps {
  href?: string
  className?: string
}

function normalizeNotificationDoc(
  id: string,
  data: Record<string, unknown>,
): AppNotification {
  return {
    id,
    type: (data["type"] as AppNotification["type"]) ?? "booking_pending_payment",
    title: (data["title"] as string) ?? "",
    body: (data["body"] as string) ?? "",
    href: (data["href"] as string | null | undefined) ?? null,
    readAt: (data["readAt"] as string | null | undefined) ?? null,
    createdAt:
      typeof data["createdAt"] === "string" ? data["createdAt"] : new Date().toISOString(),
  }
}

export function NotificationBell({
  href = "/dashboard/notifications",
  className,
}: NotificationBellProps) {
  const { user, role } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    if (!user || role !== "user") return

    const db = getFirebaseDb()
    const notificationsQuery = query(
      collection(db, "users", user.uid, "notifications"),
      orderBy("createdAt", "desc"),
    )

    return onSnapshot(notificationsQuery, (snapshot) => {
      setNotifications(
        snapshot.docs.map((doc) =>
          normalizeNotificationDoc(doc.id, doc.data() as Record<string, unknown>),
        ),
      )
    })
  }, [role, user])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  )

  if (!user || role !== "user") return null

  return (
    <Link
      href={href}
      aria-label={
        unreadCount > 0
          ? `Abrir notificaciones (${unreadCount} sin leer)`
          : "Abrir notificaciones"
      }
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] transition-colors duration-200 hover:border-[#10b981] hover:text-[#059669]",
        className,
      )}
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#10b981] px-1 text-[10px] font-bold leading-none text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      ) : null}
    </Link>
  )
}
