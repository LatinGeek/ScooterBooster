"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Wrench,
  Bike,
  User,
  Calendar,
  CreditCard,
  MessageCircle,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReviewForm } from "@/components/review-form"
import type { Booking, BookingStatus, Technician, Service, ScooterModel } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Status config ────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Payment return banner ────────────────────────────────────────────────────

function PaymentReturnBanner({ status }: { status?: string }) {
  if (!status) return null
  if (status === "success") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#a7f3d0] bg-[#d1fae5] px-4 py-3">
        <CheckCircle className="h-5 w-5 shrink-0 text-[#10b981]" />
        <p className="text-sm font-medium text-[#065f46]">
          ¡Pago exitoso! Tu reserva está confirmada.
        </p>
      </div>
    )
  }
  if (status === "failure") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <XCircle className="h-5 w-5 shrink-0 text-red-600" />
        <p className="text-sm font-medium text-red-700">
          El pago falló. Podés intentarlo de nuevo.
        </p>
      </div>
    )
  }
  if (status === "pending") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <Clock className="h-5 w-5 shrink-0 text-amber-600" />
        <p className="text-sm font-medium text-amber-700">
          El pago está siendo procesado. Te avisaremos cuando se confirme.
        </p>
      </div>
    )
  }
  return null
}

// ─── Action buttons ───────────────────────────────────────────────────────────

function ActionBar({
  booking,
  role,
  onStatusChange,
}: {
  booking: Booking
  role: string
  onStatusChange: (status: BookingStatus) => Promise<void>
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
        {role === "technician" && (
          <>
            <Button onClick={() => transition("confirmed")} disabled={!!loading}>
              {loading === "confirmed" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Confirmar
            </Button>
            <Button
              variant="outline"
              onClick={() => transition("cancelled_by_technician")}
              disabled={!!loading}
            >
              {loading === "cancelled_by_technician" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Rechazar
            </Button>
          </>
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

  if (status === "completed" && role === "user") {
    return (
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <a href={`/technicians/${booking.technicianId}`}>Dejar reseña</a>
        </Button>
      </div>
    )
  }

  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  const statusCfg = STATUS_CONFIG[booking.status]
  const StatusIcon = statusCfg.icon

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

  // WhatsApp link
  const whatsappUrl = technician?.whatsappNumber
    ? `https://wa.me/${technician.whatsappNumber}?text=${encodeURIComponent(
        `Hola! Te escribo por mi reserva #${booking.id.slice(0, 8)} en ScooterBooster.`
      )}`
    : null

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Detalle de Reserva</h1>
            <p className="mt-0.5 text-sm text-[#9ca3af]">#{booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${statusCfg.bg} ${statusCfg.color}`}
          >
            <StatusIcon className="h-4 w-4" />
            {statusCfg.label}
          </div>
        </div>
      </div>

      {/* Payment return banner */}
      <PaymentReturnBanner status={paymentReturnStatus} />

      {/* Details card */}
      <div className="divide-y divide-[#e5e7eb] rounded-xl border border-[#e5e7eb] bg-white">
        {scooterModel && (
          <DetailRow
            icon={<Bike className="h-4 w-4 text-[#10b981]" />}
            label="Scooter"
            value={scooterModel.name}
          />
        )}
        {service && (
          <DetailRow
            icon={<Wrench className="h-4 w-4 text-[#10b981]" />}
            label="Servicio"
            value={service.name}
          />
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
          <DetailRow
            icon={<AlertCircle className="h-4 w-4 text-[#10b981]" />}
            label="Notas"
            value={booking.notes}
          />
        )}

        {/* Pricing */}
        <div className="px-4 py-4">
          <p className="mb-3 text-xs font-semibold tracking-wider text-[#9ca3af] uppercase">
            Precio
          </p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-[#6b7280]">
              <span>Precio base</span>
              <span>{formatUYU(booking.basePrice)}</span>
            </div>
            <div className="flex justify-between text-[#6b7280]">
              <span>Fee de servicio</span>
              <span>{formatUYU(booking.serviceFee)}</span>
            </div>
            <div className="flex justify-between border-t border-[#e5e7eb] pt-2 font-bold text-[#111827]">
              <span>Total</span>
              <span className="text-[#10b981]">{formatUYU(booking.totalPrice)}</span>
            </div>
          </div>
        </div>

        {/* Payment status */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-[#10b981]" />
            <span className="text-[#6b7280]">Estado del pago:</span>
            <span
              className={`font-semibold ${
                booking.paymentStatus === "paid"
                  ? "text-[#10b981]"
                  : booking.paymentStatus === "refunded"
                    ? "text-amber-600"
                    : "text-[#9ca3af]"
              }`}
            >
              {booking.paymentStatus === "paid"
                ? "Pagado"
                : booking.paymentStatus === "refunded"
                  ? "Reembolsado"
                  : "Pendiente"}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 space-y-3">
        <ActionBar booking={booking} role={role} onStatusChange={handleStatusChange} />

        {/* WhatsApp contact */}
        {whatsappUrl &&
          !["cancelled_by_user", "cancelled_by_technician", "expired"].includes(booking.status) && (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Contactar técnico por WhatsApp
              </a>
            </Button>
          )}
      </div>

      {/* Review form — only for users, completed bookings, no existing review */}
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

      {/* Timestamps */}
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
