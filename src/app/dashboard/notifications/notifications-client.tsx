"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore"
import {
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle,
  Clock3,
  CreditCard,
  Wrench,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getFirebaseDb } from "@/lib/firebase"
import type { AppNotification } from "@/types"

interface Props {
  userId: string
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

function iconForNotification(type: AppNotification["type"]) {
  switch (type) {
    case "booking_pending_payment":
      return CreditCard
    case "booking_confirmed":
      return CheckCircle
    case "booking_in_progress":
      return Wrench
    case "booking_completed":
      return BellRing
    case "booking_cancelled":
      return XCircle
    default:
      return Bell
  }
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso))
}

export function NotificationsClient({ userId }: Props) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    const db = getFirebaseDb()
    const notificationsQuery = query(
      collection(db, "users", userId, "notifications"),
      orderBy("createdAt", "desc"),
    )

    return onSnapshot(notificationsQuery, (snapshot) => {
      setNotifications(
        snapshot.docs.map((notificationDoc) =>
          normalizeNotificationDoc(
            notificationDoc.id,
            notificationDoc.data() as Record<string, unknown>,
          ),
        ),
      )
    })
  }, [userId])

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  )

  async function markAsRead(notificationId: string) {
    const db = getFirebaseDb()
    await updateDoc(doc(db, "users", userId, "notifications", notificationId), {
      readAt: new Date().toISOString(),
    })
  }

  async function markAllAsRead() {
    setMarkingAll(true)
    try {
      const db = getFirebaseDb()
      const batch = writeBatch(db)

      for (const notification of notifications.filter((entry) => !entry.readAt)) {
        batch.update(doc(db, "users", userId, "notifications", notification.id), {
          readAt: new Date().toISOString(),
        })
      }

      await batch.commit()
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Notificaciones</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Seguí el estado de tus reservas sin depender solo del email o WhatsApp.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => void markAllAsRead()}
          disabled={markingAll || unreadCount === 0}
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          {markingAll ? "Marcando..." : "Marcar todo como leído"}
        </Button>
      </div>

      <div className="mb-4 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm text-[#6b7280] shadow-sm">
        <span className="font-semibold text-[#111827]">{notifications.length}</span> notificaciones
        {" · "}
        <span className="font-semibold text-[#10b981]">{unreadCount}</span> sin leer
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-white px-6 py-14 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d1fae5]">
            <Bell className="h-7 w-7 text-[#10b981]" />
          </div>
          <h2 className="text-lg font-semibold text-[#111827]">Todavía no hay novedades</h2>
          <p className="mt-2 text-sm text-[#6b7280]">
            Cuando tu reserva cambie de estado o necesite atención, la vas a ver acá.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => {
            const Icon = iconForNotification(notification.type)
            return (
              <article
                key={notification.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition-colors ${
                  notification.readAt
                    ? "border-[#e5e7eb]"
                    : "border-[#a7f3d0] bg-[#f8fffb]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      notification.readAt ? "bg-[#f3f4f6]" : "bg-[#d1fae5]"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${
                        notification.readAt ? "text-[#6b7280]" : "text-[#059669]"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-[#111827]">{notification.title}</h2>
                      {!notification.readAt ? (
                        <span className="rounded-full bg-[#d1fae5] px-2 py-0.5 text-[11px] font-semibold text-[#065f46]">
                          Nueva
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[#4b5563]">{notification.body}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs text-[#9ca3af]">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(notification.createdAt)}
                      </span>

                      {notification.href ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={notification.href}>Ver detalle</Link>
                        </Button>
                      ) : null}

                      {!notification.readAt ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#059669]"
                          onClick={() => void markAsRead(notification.id)}
                        >
                          Marcar como leída
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
