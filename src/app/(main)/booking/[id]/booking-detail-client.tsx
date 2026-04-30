"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Bike,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Loader2,
  MessageCircle,
  RefreshCw,
  User,
  Wrench,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReviewForm } from "@/components/review-form"
import { trackAnalyticsEventOncePerSession } from "@/lib/analytics"
import { buildWhatsAppUrl, WA_MESSAGES } from "@/lib/messages"
import type { Booking, BookingStatus, Technician, Service, ScooterModel } from "@/types"

interface Props {
  booking: Booking
  technician: Technician | null
  service: Service | null
  scooterModel: ScooterModel | null
  role: string
  userId: string
  paymentReturnStatus?: string
  hasReview?: boolean
}

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string; icon: React.FC<{ className?: string }> }
> = {
  pending: {
    label: "Pendiente de pago",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
    icon: Clock,
  },
  confirmed: {
    label: "Confirmada",
    color: "text-[#065f46]",
    bg: "bg-[#d1fae5] border-[#a7f3d0]",
    icon: CheckCircle,
  },
  in_progress: {
    label: "En curso",
    color: "text-[#1d4ed8]",
    bg: "bg-blue-50 border-blue-200",
    icon: Wrench,
  },
  completed: {
    label: "Completada",
    color: "text-[#065f46]",
    bg: "bg-[#d1fae5] border-[#a7f3d0]",
    icon: CheckCircle,
  },
  cancelled_by_user: {
    label: "Cancelada por el usuario",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
  },
  cancelled_by_technician: {
    label: "Cancelada por el técnico",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: XCircle,
  },
  expired: {
    label: "Expirada",
    color: "text-[#6b7280]",
    bg: "bg-[#f3f4f6] border-[#e5e7eb]",
    icon: AlertCircle,
  },
}

const TIMELINE_STEPS: Array<{ id: BookingStatus; label: string }> = [
  { id: "pending", label: "Pago" },
  { id: "confirmed", label: "Confirmación" },
  { id: "in_progress", label: "Servicio" },
  { id: "completed", label: "Completa" },
]

function formatUYU(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(iso))
}

function getPaymentBadge(booking: Booking) {
  if (booking.paymentStatus === "paid") {
    return { label: "Reserva online paga", tone: "text-[#065f46] bg-[#d1fae5]" }
  }
  if (booking.paymentStatus === "refunded") {
    return { label: "Reserva online reembolsada", tone: "text-amber-700 bg-amber-50" }
  }
  return { label: "Reserva online pendiente", tone: "text-amber-700 bg-amber-50" }
}

function getTimelineStepState(target: BookingStatus, booking: Booking) {
  if (booking.status === "cancelled_by_user" || booking.status === "cancelled_by_technician" || booking.status === "expired") {
    return "upcoming" as const
  }

  const currentIndex = TIMELINE_STEPS.findIndex((step) => step.id === booking.status)
  const targetIndex = TIMELINE_STEPS.findIndex((step) => step.id === target)
  if (targetIndex <= currentIndex) return "done" as const
  if (targetIndex === currentIndex + 1) return "current" as const
  return "upcoming" as const
}

function getBookingGuidance(booking: Booking, paymentReturnStatus?: string) {
  if (paymentReturnStatus === "success" && booking.paymentStatus !== "paid") {
    return {
      title: "Estamos validando tu pago",
      body: "Mercado Pago ya nos devolvió al sitio, pero la confirmación final de la reserva online puede tardar unos segundos. Si este estado no cambia, refrescá la página.",
    }
  }

  if (booking.status === "pending") {
    return {
      title: "Te falta completar el pago",
      body: "La reserva ya quedó creada. Cuando Mercado Pago confirme el cobro de la reserva online, la pasamos a confirmada automáticamente.",
    }
  }

  if (booking.status === "confirmed") {
    return {
      title: "Tu turno ya está confirmado",
      body: "Ahora solo queda coordinar con el técnico cualquier detalle final, incluido el pago del servicio por fuera de ScooterBooster.",
    }
  }

  if (booking.status === "in_progress") {
    return {
      title: "El servicio ya está en marcha",
      body: "Tu técnico marcó la reserva como en curso. Si necesitás contexto extra, podés escribirle por WhatsApp desde acá.",
    }
  }

  if (booking.status === "completed") {
    return {
      title: "Reserva finalizada",
      body: "Todo quedó completado. Si te fue bien, este es un buen momento para dejar una reseña y ayudar a otros usuarios.",
    }
  }

  return {
    title: "Reserva cerrada",
    body: "Este turno ya no necesita más acciones, pero podés revisar el detalle o volver a reservar cuando quieras.",
  }
}

function PaymentReturnBanner({
  booking,
  status,
  onRefresh,
}: {
  booking: Booking
  status?: string
  onRefresh: () => void
}) {
  const showPendingSync = status === "success" && booking.paymentStatus !== "paid"

  if (!status && !showPendingSync) return null

  if (status === "success" && booking.paymentStatus === "paid") {
    return (
      <div className="mb-6 rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#10b981]" />
          <div>
            <p className="font-semibold text-[#065f46]">Pago acreditado y reserva confirmada</p>
            <p className="mt-1 text-sm text-[#047857]">
              Ya quedó registrado en ScooterBooster. Más abajo tenés el contacto del técnico para coordinar el servicio y su pago directo.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === "success" || status === "pending") {
    return (
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800">Pago en revisión</p>
            <p className="mt-1 text-sm text-amber-700">
              Mercado Pago todavía puede tardar un poco en terminar la confirmación. Si en unos segundos sigue pendiente, refrescá esta pantalla.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
                Actualizar estado
              </Button>
              {booking.paymentLinkUrl ? (
                <Button type="button" size="sm" asChild>
                  <a href={booking.paymentLinkUrl} target="_blank" rel="noopener noreferrer">
                    <CreditCard className="h-4 w-4" />
                    Volver a Mercado Pago
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === "failure") {
    return (
      <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-red-700">El pago no se pudo completar</p>
            <p className="mt-1 text-sm text-red-600">
              La reserva sigue creada pero sin confirmar. Podés reintentar el pago de la reserva online desde este mismo detalle cuando quieras.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {booking.paymentLinkUrl ? (
                <Button type="button" size="sm" asChild>
                  <a href={booking.paymentLinkUrl} target="_blank" rel="noopener noreferrer">
                    <CreditCard className="h-4 w-4" />
                    Reintentar pago
                  </a>
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4" />
                Revisar estado actual
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

function BookingTimeline({ booking }: { booking: Booking }) {
  const isClosed = ["cancelled_by_user", "cancelled_by_technician", "expired"].includes(booking.status)

  if (isClosed) {
    return (
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
        <p className="text-sm font-semibold text-[#111827]">Estado final</p>
        <p className="mt-1 text-sm text-[#6b7280]">
          Esta reserva quedó cerrada en estado <span className="font-medium text-[#111827]">{STATUS_CONFIG[booking.status].label.toLowerCase()}</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
      <p className="text-sm font-semibold text-[#111827]">Seguimiento de la reserva</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {TIMELINE_STEPS.map((step) => {
          const state = getTimelineStepState(step.id, booking)
          return (
            <div
              key={step.id}
              className={`rounded-2xl border px-3 py-3 text-sm transition-colors duration-150 ${
                state === "done"
                  ? "border-[#a7f3d0] bg-[#ecfdf5]"
                  : state === "current"
                    ? "border-blue-200 bg-blue-50"
                    : "border-[#e5e7eb] bg-[#f9fafb]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${
                  state === "done"
                    ? "bg-[#10b981]"
                    : state === "current"
                      ? "bg-[#2563eb]"
                      : "bg-[#cbd5e1]"
                }`} />
                <p className="font-semibold text-[#111827]">{step.label}</p>
              </div>
              <p className="mt-2 text-xs text-[#6b7280]">
                {state === "done"
                  ? "Paso completado"
                  : state === "current"
                    ? "Es lo que está pasando ahora"
                    : "Todavía pendiente"}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActionBar({
  booking,
  role,
  onStatusChange,
  onInitiatePayment,
  initiatingPayment,
}: {
  booking: Booking
  role: string
  onStatusChange: (status: BookingStatus) => Promise<void>
  onInitiatePayment: () => Promise<void>
  initiatingPayment: boolean
}) {
  const [loading, setLoading] = useState<string | null>(null)

  async function transition(status: BookingStatus) {
    setLoading(status)
    await onStatusChange(status)
    setLoading(null)
  }

  const { status } = booking

  if (status === "pending") {
    return (
      <div className="flex flex-wrap gap-3">
        {booking.paymentLinkUrl && (
          <Button asChild>
            <a href={booking.paymentLinkUrl} target="_blank" rel="noopener noreferrer">
              <CreditCard className="h-4 w-4" />
              Pagar ahora
            </a>
          </Button>
        )}
        {!booking.paymentLinkUrl && (
          <Button onClick={() => onInitiatePayment()} disabled={initiatingPayment}>
            {initiatingPayment ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="h-4 w-4" />
            )}
            Generar link de pago
          </Button>
        )}
        {role === "user" && (
          <Button
            variant="outline"
            onClick={() => transition("cancelled_by_user")}
            disabled={!!loading}
          >
            {loading === "cancelled_by_user" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancelar reserva
          </Button>
        )}
      </div>
    )
  }

  if (status === "confirmed") {
    return (
      <div className="flex flex-wrap gap-3">
        {role === "technician" && (
          <Button onClick={() => transition("in_progress")} disabled={!!loading}>
            {loading === "in_progress" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wrench className="h-4 w-4" />
            )}
            Marcar en curso
          </Button>
        )}
      </div>
    )
  }

  if (status === "in_progress") {
    return (
      <div className="flex flex-wrap gap-3">
        {role === "technician" && (
          <Button onClick={() => transition("completed")} disabled={!!loading}>
            {loading === "completed" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Marcar como completada
          </Button>
        )}
      </div>
    )
  }

  return null
}

export function BookingDetailClient({
  booking: initialBooking,
  technician,
  service,
  scooterModel,
  role,
  paymentReturnStatus,
  hasReview = false,
}: Props) {
  const router = useRouter()
  const [booking, setBooking] = useState<Booking>(initialBooking)
  const [error, setError] = useState<string | null>(null)
  const [initiatingPayment, setInitiatingPayment] = useState(false)

  const statusCfg = STATUS_CONFIG[booking.status]
  const StatusIcon = statusCfg.icon
  const paymentBadge = getPaymentBadge(booking)
  const guidance = useMemo(
    () => getBookingGuidance(booking, paymentReturnStatus),
    [booking, paymentReturnStatus],
  )

  async function handleStatusChange(status: BookingStatus) {
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const json = (await res.json()) as { success: boolean; data?: Booking; error?: string }
      if (!res.ok || !json.success) {
        setError(json.error ?? "Error al actualizar la reserva.")
        return
      }
      if (json.data) setBooking(json.data)
      router.refresh()
    } catch {
      setError("Error de conexión. Intentá de nuevo.")
    }
  }

  async function handleInitiatePayment() {
    setError(null)
    setInitiatingPayment(true)
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
        setError(json.error ?? "No se pudo generar el link de pago.")
        return
      }

      setBooking((current) => ({
        ...current,
        paymentLinkId: json.data?.preferenceId ?? current.paymentLinkId,
        paymentLinkUrl: json.data?.initPoint ?? current.paymentLinkUrl,
      }))

      window.open(json.data.initPoint, "_blank", "noopener,noreferrer")
      router.refresh()
    } catch {
      setError("No se pudo generar el link de pago.")
    } finally {
      setInitiatingPayment(false)
    }
  }

  const whatsappUrl = technician?.whatsappNumber
    ? buildWhatsAppUrl(
        technician.whatsappNumber,
        WA_MESSAGES.userContactTechnician(booking.id.slice(0, 8).toUpperCase()),
      )
    : null

  useEffect(() => {
    if (paymentReturnStatus === "success" || booking.paymentStatus === "paid") {
      trackAnalyticsEventOncePerSession(`payment-succeeded:${booking.id}`, "payment_succeeded", {
        booking_id: booking.id,
      })
    }

    if (paymentReturnStatus === "failure") {
      trackAnalyticsEventOncePerSession(`payment-failed:${booking.id}`, "payment_failed", {
        booking_id: booking.id,
      })
    }

    if (booking.status === "confirmed") {
      trackAnalyticsEventOncePerSession(`booking-confirmed:${booking.id}`, "booking_confirmed", {
        booking_id: booking.id,
        technician_id: booking.technicianId,
      })
    }
  }, [booking.id, booking.paymentStatus, booking.status, booking.technicianId, paymentReturnStatus])

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Detalle de reserva</h1>
            <p className="mt-0.5 text-sm text-[#9ca3af]">#{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
            <StatusIcon className="h-4 w-4" />
            {statusCfg.label}
          </div>
        </div>
      </div>

      <PaymentReturnBanner booking={booking} status={paymentReturnStatus} onRefresh={() => router.refresh()} />

      <div className="mb-6 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#111827]">Qué sigue ahora</p>
            <h2 className="mt-2 text-xl font-bold text-[#111827]">{guidance.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">{guidance.body}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentBadge.tone}`}>
            {paymentBadge.label}
          </span>
        </div>
      </div>

      <div className="mb-6">
        <BookingTimeline booking={booking} />
      </div>

      <div className="divide-y divide-[#e5e7eb] rounded-xl border border-[#e5e7eb] bg-white">
        {scooterModel && (
          <DetailRow icon={<Bike className="h-4 w-4 text-[#10b981]" />} label="Scooter" value={scooterModel.name} />
        )}
        {service && (
          <DetailRow icon={<Wrench className="h-4 w-4 text-[#10b981]" />} label="Servicio" value={service.name} />
        )}
        {technician && (
          <DetailRow
            icon={<User className="h-4 w-4 text-[#10b981]" />}
            label="Técnico"
            value={technician.displayName}
            sub={technician.location}
          />
        )}
        <DetailRow
          icon={<Calendar className="h-4 w-4 text-[#10b981]" />}
          label="Fecha y hora"
          value={formatDate(booking.scheduledDate)}
        />
        {booking.notes && (
          <DetailRow icon={<AlertCircle className="h-4 w-4 text-[#10b981]" />} label="Notas" value={booking.notes} />
        )}

        <div className="px-4 py-4">
          <p className="mb-3 text-xs font-semibold tracking-wider text-[#9ca3af] uppercase">Precio</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-[#6b7280]">
              <span>Pago al técnico</span>
              <span>{formatUYU(booking.basePrice)}</span>
            </div>
            <div className="flex justify-between text-[#6b7280]">
              <span>Reserva online</span>
              <span>{formatUYU(booking.serviceFee)}</span>
            </div>
            <div className="flex justify-between border-t border-[#e5e7eb] pt-2 font-bold text-[#111827]">
              <span>Total de referencia</span>
              <span className="text-[#10b981]">{formatUYU(booking.totalPrice)}</span>
            </div>
            <p className="pt-2 text-xs text-[#6b7280]">
              ScooterBooster cobra solo la reserva online. El pago del servicio al técnico se
              coordina directamente con él.
            </p>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-[#10b981]" />
            <span className="text-[#6b7280]">Estado de la reserva online:</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paymentBadge.tone}`}>{paymentBadge.label}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <ActionBar
          booking={booking}
          role={role}
          onStatusChange={handleStatusChange}
          onInitiatePayment={handleInitiatePayment}
          initiatingPayment={initiatingPayment}
        />

        {whatsappUrl && !["cancelled_by_user", "cancelled_by_technician", "expired"].includes(booking.status) && (
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4" />
              Contactar técnico por WhatsApp
            </a>
          </Button>
        )}
      </div>

      {booking.status === "completed" && role === "user" && technician && (
        <div className="mt-6">
          {hasReview ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#6b7280]">
              <CheckCircle className="h-4 w-4 text-[#10b981]" />
              Ya dejaste una reseña para este servicio.
            </div>
          ) : (
            <ReviewForm
              bookingId={booking.id}
              technicianId={booking.technicianId}
              technicianName={technician.displayName}
            />
          )}
        </div>
      )}

      <div className="mt-8 text-xs text-[#9ca3af]">
        <p>Creada: {formatDate(booking.createdAt)}</p>
        <p>Actualizada: {formatDate(booking.updatedAt)}</p>
      </div>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wider text-[#9ca3af] uppercase">{label}</p>
        <p className="mt-0.5 font-semibold text-[#111827]">{value}</p>
        {sub && <p className="text-sm text-[#6b7280]">{sub}</p>}
      </div>
    </div>
  )
}
