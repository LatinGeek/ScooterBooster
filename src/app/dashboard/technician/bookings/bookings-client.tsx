"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"
import {
  CalendarDays,
  CheckCircle,
  Clock,
  XCircle,
  Wrench,
  MessageCircle,
  AlertCircle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Booking, BookingStatus, Service, ScooterModel } from "@/types"

interface Props {
  initialBookings: Booking[]
  services: Record<string, Service>
  models: Record<string, ScooterModel>
  technicianId: string
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string; icon: React.FC<{ className?: string }> }
> = {
  pending: { label: "Pendiente de pago", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock },
  confirmed: { label: "Confirmada", color: "text-[#065f46]", bg: "bg-[#d1fae5] border-[#a7f3d0]", icon: CheckCircle },
  in_progress: { label: "En curso", color: "text-[#1d4ed8]", bg: "bg-blue-50 border-blue-200", icon: Wrench },
  completed: { label: "Completada", color: "text-[#065f46]", bg: "bg-[#d1fae5] border-[#a7f3d0]", icon: CheckCircle },
  cancelled_by_user: { label: "Cancelada por usuario", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  cancelled_by_technician: { label: "Cancelada por vos", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: XCircle },
  expired: { label: "Expirada", color: "text-[#6b7280]", bg: "bg-[#f3f4f6] border-[#e5e7eb]", icon: AlertCircle },
}

type Tab = "pending" | "upcoming" | "past" | "cancelled"

const TAB_STATUSES: Record<Tab, BookingStatus[]> = {
  pending: ["pending"],
  upcoming: ["confirmed", "in_progress"],
  past: ["completed"],
  cancelled: ["cancelled_by_user", "cancelled_by_technician", "expired"],
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-UY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(n)
}

// Allowed transitions for technician
const TECH_TRANSITIONS: Partial<Record<BookingStatus, { label: string; next: BookingStatus }>> = {
  confirmed: { label: "Iniciar servicio", next: "in_progress" },
  in_progress: { label: "Marcar completado", next: "completed" },
  pending: { label: "Cancelar reserva", next: "cancelled_by_technician" },
}

export function TechnicianBookingsClient({ initialBookings, services, models, technicianId }: Props) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [activeTab, setActiveTab] = useState<Tab>("pending")
  const [transitioning, setTransitioning] = useState<string | null>(null)

  useEffect(() => {
    const db = getFirebaseDb()
    const q = query(
      collection(db, "bookings"),
      where("technicianId", "==", technicianId),
      orderBy("createdAt", "desc"),
    )
    const unsub = onSnapshot(q, (snap) => {
      const updated: Booking[] = snap.docs.map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          userId: d["userId"] as string,
          technicianId: d["technicianId"] as string,
          serviceId: d["serviceId"] as string,
          scooterModelId: d["scooterModelId"] as string,
          status: d["status"] as BookingStatus,
          scheduledDate: d["scheduledDate"] as string,
          notes: (d["notes"] as string | null) ?? null,
          basePrice: d["basePrice"] as number,
          serviceFee: d["serviceFee"] as number,
          totalPrice: d["totalPrice"] as number,
          paymentStatus: d["paymentStatus"] as Booking["paymentStatus"],
          paymentLinkId: (d["paymentLinkId"] as string | null) ?? null,
          paymentLinkUrl: (d["paymentLinkUrl"] as string | null) ?? null,
          disclaimerAccepted: Boolean(d["disclaimerAccepted"]),
          disclaimerAcceptedAt: (d["disclaimerAcceptedAt"] as string | null) ?? null,
          disclaimerVersion: (d["disclaimerVersion"] as string | null) ?? null,
          createdAt: d["createdAt"] as string,
          updatedAt: d["updatedAt"] as string,
        }
      })
      setBookings(updated)
    })
    return () => unsub()
  }, [technicianId])

  async function handleTransition(bookingId: string, nextStatus: BookingStatus) {
    setTransitioning(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        toast.error(json.error ?? "No se pudo actualizar el estado.")
      } else {
        const statusLabels: Partial<Record<BookingStatus, string>> = {
          confirmed: "Reserva confirmada",
          in_progress: "Servicio iniciado",
          completed: "Servicio completado",
          cancelled_by_technician: "Reserva cancelada",
        }
        const msg = statusLabels[nextStatus]
        if (msg) toast.success(msg)
      }
    } finally {
      setTransitioning(null)
    }
  }

  const grouped: Record<Tab, Booking[]> = {
    pending: bookings.filter((b) => TAB_STATUSES.pending.includes(b.status)),
    upcoming: bookings.filter((b) => TAB_STATUSES.upcoming.includes(b.status)),
    past: bookings.filter((b) => TAB_STATUSES.past.includes(b.status)),
    cancelled: bookings.filter((b) => TAB_STATUSES.cancelled.includes(b.status)),
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "pending", label: "Pendientes" },
    { id: "upcoming", label: "Próximas" },
    { id: "past", label: "Historial" },
    { id: "cancelled", label: "Canceladas" },
  ]

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Reservas</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Gestioná el estado de tus turnos.</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-[#f3f4f6] p-1">
        {tabs.map((tab) => {
          const count = grouped[tab.id].length
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                activeTab === tab.id
                  ? "bg-white text-[#111827] shadow-sm"
                  : "text-[#6b7280] hover:text-[#111827]"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                    activeTab === tab.id
                      ? "bg-[#d1fae5] text-[#059669]"
                      : "bg-[#e5e7eb] text-[#6b7280]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {grouped[activeTab].length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d1fae5]">
            <Zap className="h-8 w-8 text-[#10b981]" />
          </div>
          <p className="text-sm text-[#6b7280]">No hay reservas en esta categoría.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped[activeTab].map((booking) => {
            const cfg = STATUS_CONFIG[booking.status]
            const StatusIcon = cfg.icon
            const transition = TECH_TRANSITIONS[booking.status]
            const isBusy = transitioning === booking.id
            const service = services[booking.serviceId]
            const model = models[booking.scooterModelId]

            const waMsg = encodeURIComponent(
              `Hola, tengo tu reserva en ScooterBooster (ID: ${booking.id}). Quisiera coordinar algunos detalles.`,
            )

            return (
              <div
                key={booking.id}
                className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#111827]">
                      {service?.name ?? "Servicio"}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-[#6b7280]">
                      {model?.name ?? "Scooter"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </span>
                </div>

                <div className="mb-4 flex flex-wrap gap-4 text-sm text-[#6b7280]">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-[#10b981]" />
                    {formatDate(booking.scheduledDate)}
                  </span>
                  <span className="text-[#111827] font-medium">
                    {formatPrice(booking.basePrice)} base
                  </span>
                </div>

                {booking.notes && (
                  <p className="mb-4 rounded-lg bg-[#f9fafb] px-3 py-2 text-xs text-[#6b7280]">
                    Notas: {booking.notes}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 border-t border-[#f3f4f6] pt-4">
                  {transition && (
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleTransition(booking.id, transition.next)}
                      className={transition.next === "cancelled_by_technician" ? "bg-red-500 hover:bg-red-600" : ""}
                    >
                      {isBusy ? (
                        <Wrench className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : null}
                      {transition.label}
                    </Button>
                  )}

                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://wa.me/${booking.userId}?text=${waMsg}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="mr-1.5 h-4 w-4 text-[#25d366]" />
                      Contactar
                    </a>
                  </Button>

                  <Button variant="ghost" size="sm" asChild className="ml-auto text-[#6b7280]">
                    <Link href={`/booking/${booking.id}`}>Ver detalle →</Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
