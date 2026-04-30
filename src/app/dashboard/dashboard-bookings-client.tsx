"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  Clock,
  CreditCard,
  MessageCircle,
  Star,
  Wrench,
  XCircle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getFirebaseDb } from "@/lib/firebase"
import { buildWhatsAppUrl, WA_MESSAGES } from "@/lib/messages"
import type { Booking, BookingStatus, ScooterModel, Service, Technician } from "@/types"

interface Props {
  initialBookings: Booking[]
  technicians: Record<string, Technician>
  services: Record<string, Service>
  models: Record<string, ScooterModel>
  userId: string
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string; dot: string; icon: React.FC<{ className?: string }> }
> = {
  pending: {
    label: "Pendiente de pago",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    dot: "bg-amber-400",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmada",
    color: "text-[#065f46]",
    bg: "bg-[#d1fae5] border-[#a7f3d0]",
    dot: "bg-[#10b981]",
    icon: CheckCircle,
  },
  in_progress: {
    label: "En curso",
    color: "text-[#1d4ed8]",
    bg: "bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
    icon: Wrench,
  },
  completed: {
    label: "Completada",
    color: "text-[#065f46]",
    bg: "bg-[#d1fae5] border-[#a7f3d0]",
    dot: "bg-[#10b981]",
    icon: CheckCircle,
  },
  cancelled_by_user: {
    label: "Cancelada por vos",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    dot: "bg-red-400",
    icon: XCircle,
  },
  cancelled_by_technician: {
    label: "Cancelada por el técnico",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    dot: "bg-red-400",
    icon: XCircle,
  },
  expired: {
    label: "Expirada",
    color: "text-[#6b7280]",
    bg: "bg-[#f3f4f6] border-[#e5e7eb]",
    dot: "bg-[#9ca3af]",
    icon: AlertCircle,
  },
}

const UPCOMING_STATUSES: BookingStatus[] = ["pending", "confirmed", "in_progress"]
const PAST_STATUSES: BookingStatus[] = ["completed"]
const CANCELLED_STATUSES: BookingStatus[] = [
  "cancelled_by_user",
  "cancelled_by_technician",
  "expired",
]

type Tab = "upcoming" | "past" | "cancelled"

function formatDate(iso: string): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-UY", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getPaymentLabel(booking: Booking) {
  if (booking.paymentStatus === "paid") return "Pago confirmado"
  if (booking.paymentStatus === "refunded") return "Reembolsado"
  return "Pago pendiente"
}

function getNextStepCopy(booking: Booking) {
  switch (booking.status) {
    case "pending":
      return booking.paymentLinkUrl
        ? "Falta completar el pago para confirmar el turno."
        : "La reserva está creada y esperando el link de pago."
    case "confirmed":
      return "Ya está confirmada. Solo queda esperar la fecha o coordinar detalles."
    case "in_progress":
      return "El técnico ya marcó el servicio como en curso."
    case "completed":
      return "Servicio completado. Si querés, podés dejar una reseña."
    case "cancelled_by_user":
      return "La cancelaste desde ScooterBooster."
    case "cancelled_by_technician":
      return "El técnico canceló el turno. Revisá el detalle para ver alternativas."
    default:
      return "La reserva venció sin confirmarse a tiempo."
  }
}

interface BookingCardProps {
  booking: Booking
  technician?: Technician
  service?: Service
  model?: ScooterModel
  onCancel: (id: string) => void
  onInitiatePayment: (booking: Booking) => void
  cancelling: string | null
  initiatingPayment: string | null
  hasReviewMap: Record<string, boolean>
}

function BookingCard({
  booking,
  technician,
  service,
  model,
  onCancel,
  onInitiatePayment,
  cancelling,
  initiatingPayment,
  hasReviewMap,
}: BookingCardProps) {
  const cfg = STATUS_CONFIG[booking.status]
  const StatusIcon = cfg.icon
  const isCancelling = cancelling === booking.id
  const isInitiatingPayment = initiatingPayment === booking.id
  const showPayCTA = booking.status === "pending" && booking.paymentLinkUrl
  const showGeneratePayCTA = booking.status === "pending" && !booking.paymentLinkUrl
  const showWhatsApp =
    (booking.status === "confirmed" || booking.status === "in_progress") && technician?.whatsappNumber
  const showCancel = booking.status === "pending" || booking.status === "confirmed"
  const showReview = booking.status === "completed" && !hasReviewMap[booking.id]

  const whatsappUrl = technician?.whatsappNumber
    ? buildWhatsAppUrl(technician.whatsappNumber, WA_MESSAGES.userContactTechnician(booking.id))
    : null

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#111827]">{service?.name ?? "Servicio"}</p>
          <p className="mt-0.5 truncate text-sm text-[#6b7280]">
            {model ? `${model.name}` : "Scooter"} · {technician?.displayName ?? "Técnico"}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          {cfg.label}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-[#6b7280]">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 shrink-0 text-[#10b981]" />
          {formatDate(booking.scheduledDate)}
        </span>
        <span className="flex items-center gap-1.5">
          <CreditCard className="h-4 w-4 shrink-0 text-[#10b981]" />
          {formatPrice(booking.totalPrice)}
        </span>
      </div>

      <div className="mb-4 rounded-2xl bg-[#f8fafc] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-[#94a3b8] uppercase">Siguiente paso</p>
            <p className="mt-2 text-sm font-semibold text-[#111827]">{getNextStepCopy(booking)}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            booking.paymentStatus === "paid"
              ? "bg-[#d1fae5] text-[#065f46]"
              : booking.paymentStatus === "refunded"
                ? "bg-amber-50 text-amber-700"
                : "bg-amber-50 text-amber-700"
          }`}>
            {getPaymentLabel(booking)}
          </span>
        </div>
      </div>

      {(showPayCTA || showGeneratePayCTA || showWhatsApp || showCancel || showReview) && (
        <div className="flex flex-wrap gap-2 border-t border-[#f3f4f6] pt-4">
          {showPayCTA && (
            <Button size="sm" asChild>
              <a href={booking.paymentLinkUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                <CreditCard className="mr-1.5 h-4 w-4" />
                Pagar ahora
              </a>
            </Button>
          )}

          {showGeneratePayCTA && (
            <Button size="sm" onClick={() => onInitiatePayment(booking)} disabled={isInitiatingPayment}>
              {isInitiatingPayment ? (
                <span className="flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 animate-spin" />
                  Generando link…
                </span>
              ) : (
                <>
                  <CreditCard className="mr-1.5 h-4 w-4" />
                  Generar link de pago
                </>
              )}
            </Button>
          )}

          {showWhatsApp && whatsappUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4 text-[#25d366]" />
                Contactar técnico
              </a>
            </Button>
          )}

          {showReview && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/booking/${booking.id}#review`}>
                <Star className="mr-1.5 h-4 w-4 text-[#f59e0b]" />
                Dejar reseña
              </Link>
            </Button>
          )}

          {showCancel && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isCancelling}
              onClick={() => onCancel(booking.id)}
              className="text-red-500 hover:bg-red-50 hover:text-red-600"
            >
              {isCancelling ? (
                <span className="flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 animate-spin" />
                  Cancelando…
                </span>
              ) : (
                "Cancelar"
              )}
            </Button>
          )}

          <Button variant="ghost" size="sm" asChild className="ml-auto text-[#6b7280]">
            <Link href={`/booking/${booking.id}`}>Ver detalle →</Link>
          </Button>
        </div>
      )}

      {!showPayCTA && !showWhatsApp && !showCancel && !showReview && (
        <div className="flex border-t border-[#f3f4f6] pt-4">
          <Button variant="ghost" size="sm" asChild className="text-[#6b7280]">
            <Link href={`/booking/${booking.id}`}>Ver detalle →</Link>
          </Button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { title: string; sub: string; showCTA: boolean }> = {
    upcoming: {
      title: "No tenés reservas próximas",
      sub: "Explorá los servicios disponibles y reservá tu primer turno.",
      showCTA: true,
    },
    past: {
      title: "Aún no tenés reservas completadas",
      sub: "Tus servicios finalizados aparecerán acá.",
      showCTA: false,
    },
    cancelled: {
      title: "Sin reservas canceladas",
      sub: "Todo en orden por acá.",
      showCTA: false,
    },
  }
  const { title, sub, showCTA } = messages[tab]

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d1fae5]">
        <Zap className="h-8 w-8 text-[#10b981]" />
      </div>
      <p className="text-base font-semibold text-[#111827]">{title}</p>
      <p className="mt-1 text-sm text-[#6b7280]">{sub}</p>
      {showCTA && (
        <Button className="mt-6" asChild>
          <Link href="/services">Explorar servicios</Link>
        </Button>
      )}
    </div>
  )
}

export function DashboardBookingsClient({
  initialBookings,
  technicians,
  services,
  models,
  userId,
}: Props) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [activeTab, setActiveTab] = useState<Tab>("upcoming")
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [initiatingPayment, setInitiatingPayment] = useState<string | null>(null)
  const [hasReviewMap, setHasReviewMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const db = getFirebaseDb()
    const q = query(collection(db, "bookings"), where("userId", "==", userId), orderBy("createdAt", "desc"))
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
          paymentId: (d["paymentId"] as string | null) ?? null,
          paymentLinkId: (d["paymentLinkId"] as string | null) ?? null,
          paymentLinkUrl: (d["paymentLinkUrl"] as string | null) ?? null,
          disclaimerAccepted: Boolean(d["disclaimerAccepted"]),
          disclaimerAcceptedAt: (d["disclaimerAcceptedAt"] as string | null) ?? null,
          disclaimerVersion: (d["disclaimerVersion"] as string | null) ?? null,
          refundedAt: (d["refundedAt"] as string | null) ?? null,
          reminderSentAt: (d["reminderSentAt"] as string | null) ?? null,
          createdAt: d["createdAt"] as string,
          updatedAt: d["updatedAt"] as string,
        }
      })
      setBookings(updated)
    })
    return () => unsub()
  }, [userId])

  useEffect(() => {
    const completedIds = bookings.filter((b) => b.status === "completed").map((b) => b.id)
    if (!completedIds.length) return

    const db = getFirebaseDb()
    const reviewChecks = completedIds.map(async (bookingId) => {
      const { collection: fsCollection, getDocs, query: fsQuery, where: fsWhere } = await import("firebase/firestore")
      const snap = await getDocs(fsQuery(fsCollection(db, "reviews"), fsWhere("bookingId", "==", bookingId)))
      return { bookingId, hasReview: !snap.empty }
    })

    Promise.all(reviewChecks).then((results) => {
      const map: Record<string, boolean> = {}
      for (const result of results) map[result.bookingId] = result.hasReview
      setHasReviewMap(map)
    })
  }, [bookings])

  async function handleCancel(bookingId: string) {
    setCancelling(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled_by_user" }),
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        toast.error(json.error ?? "No se pudo cancelar la reserva.")
      }
    } finally {
      setCancelling(null)
    }
  }

  async function handleInitiatePayment(booking: Booking) {
    setInitiatingPayment(booking.id)
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      })

      const json = (await res.json()) as {
        success: boolean
        data?: { initPoint: string; preferenceId: string }
        error?: string
      }

      if (!res.ok || !json.success || !json.data?.initPoint) {
        toast.error(json.error ?? "No se pudo generar el link de pago.")
        return
      }

      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                paymentLinkId: json.data?.preferenceId ?? item.paymentLinkId,
                paymentLinkUrl: json.data?.initPoint ?? item.paymentLinkUrl,
              }
            : item,
        ),
      )

      window.open(json.data.initPoint, "_blank", "noopener,noreferrer")
      toast.success("Link de pago generado.")
    } catch {
      toast.error("No se pudo generar el link de pago.")
    } finally {
      setInitiatingPayment(null)
    }
  }

  const upcoming = bookings.filter((b) => UPCOMING_STATUSES.includes(b.status))
  const past = bookings.filter((b) => PAST_STATUSES.includes(b.status))
  const cancelled = bookings.filter((b) => CANCELLED_STATUSES.includes(b.status))

  const tabGroups: Record<Tab, Booking[]> = { upcoming, past, cancelled }
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "upcoming", label: "Próximas", count: upcoming.length },
    { id: "past", label: "Historial", count: past.length },
    { id: "cancelled", label: "Canceladas", count: cancelled.length },
  ]

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Mis reservas</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Gestioná tus turnos, pagos y contactos con técnicos.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#111827]">Cómo leer este panel</p>
        <p className="mt-1 text-sm text-[#6b7280]">
          Próximas muestra turnos que todavía requieren acción o seguimiento. Historial agrupa servicios completados y Canceladas reúne reservas cerradas sin turno activo.
        </p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-[#f3f4f6] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.id ? "bg-white text-[#111827] shadow-sm" : "text-[#6b7280] hover:text-[#111827]"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                activeTab === tab.id ? "bg-[#d1fae5] text-[#059669]" : "bg-[#e5e7eb] text-[#6b7280]"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {tabGroups[activeTab].length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div className="flex flex-col gap-4">
          {tabGroups[activeTab].map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              technician={technicians[booking.technicianId]}
              service={services[booking.serviceId]}
              model={models[booking.scooterModelId]}
              onCancel={handleCancel}
              onInitiatePayment={handleInitiatePayment}
              cancelling={cancelling}
              initiatingPayment={initiatingPayment}
              hasReviewMap={hasReviewMap}
            />
          ))}
        </div>
      )}
    </section>
  )
}
