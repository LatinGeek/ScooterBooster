"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { CalendarDays, CreditCard, Receipt, Search, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Booking, ScooterModel, Service, Technician, User } from "@/types"

interface Props {
  bookings: Booking[]
  users: Record<string, User>
  technicians: Record<string, Technician | null>
  services: Record<string, Service | null>
  models: Record<string, ScooterModel | null>
}

type StatusFilter = "all" | Booking["status"]
type PaymentFilter = "all" | Booking["paymentStatus"]

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-UY", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const statusLabels: Record<Booking["status"], string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  in_progress: "En curso",
  completed: "Completada",
  cancelled_by_user: "Cancelada por usuario",
  cancelled_by_technician: "Cancelada por tecnico",
  expired: "Vencida",
}

const paymentLabels: Record<Booking["paymentStatus"], string> = {
  pending: "Pendiente",
  paid: "Pagado",
  refunded: "Reintegrado",
}

export function AdminBookingsClient({ bookings: initialBookings, users, technicians, services, models }: Props) {
  const [bookings, setBookings] = useState(initialBookings)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [paymentStatus, setPaymentStatus] = useState<PaymentFilter>("all")
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return bookings.filter((booking) => {
      if (status !== "all" && booking.status !== status) return false
      if (paymentStatus !== "all" && booking.paymentStatus !== paymentStatus) return false

      const haystack = [
        booking.id,
        users[booking.userId]?.displayName ?? "",
        users[booking.userId]?.email ?? "",
        technicians[booking.technicianId]?.displayName ?? "",
        services[booking.serviceId]?.name ?? "",
        models[booking.scooterModelId]?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(query.toLowerCase())
    })
  }, [bookings, models, paymentStatus, query, services, status, technicians, users])

  async function cancelBooking(booking: Booking) {
    setBusyId(booking.id)
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, action: "cancel" }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(json.error ?? "No pudimos cancelar la reserva.")
        return
      }

      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? { ...item, status: "cancelled_by_user", updatedAt: new Date().toISOString() }
            : item,
        ),
      )
      toast.success("Reserva cancelada desde el panel admin.")
    } finally {
      setBusyId(null)
    }
  }

  async function refundBooking(booking: Booking) {
    if (!booking.paymentId) {
      toast.error("Esta reserva todavia no tiene un paymentId asociado.")
      return
    }

    setBusyId(booking.id)
    try {
      const response = await fetch(`/api/payments/${booking.paymentId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(json.error ?? "No pudimos procesar el reembolso.")
        return
      }

      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                paymentStatus: "refunded",
                status: "cancelled_by_user",
                refundedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      toast.success("Reembolso registrado correctamente.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Reservas y pagos</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Opera cancelaciones, seguimiento de pagos y reembolsos sin salir del panel admin.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50">
          <CalendarDays className="h-5 w-5 text-amber-700" />
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm lg:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por usuario, tecnico, servicio, scooter o ID"
            className="pl-10"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          className="h-10 rounded-xl border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
        >
          <option value="all">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={paymentStatus}
          onChange={(event) => setPaymentStatus(event.target.value as PaymentFilter)}
          className="h-10 rounded-xl border border-[#d1d5db] bg-white px-3 text-sm text-[#111827]"
        >
          <option value="all">Todos los pagos</option>
          {Object.entries(paymentLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filtered.map((booking) => {
          const user = users[booking.userId]
          const technician = technicians[booking.technicianId]
          const service = services[booking.serviceId]
          const model = models[booking.scooterModelId]
          const canRefund = booking.paymentStatus === "paid"
          const canCancel =
            booking.paymentStatus !== "paid" &&
            !["cancelled_by_user", "cancelled_by_technician", "completed", "expired"].includes(booking.status)

          return (
            <article key={booking.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#f3f4f6] px-2.5 py-1 text-xs font-semibold text-[#4b5563]">
                      {booking.id}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
                      {statusLabels[booking.status]}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {paymentLabels[booking.paymentStatus]}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-[#111827]">
                    {service?.name ?? booking.serviceId} · {model?.name ?? booking.scooterModelId}
                  </h2>
                  <div className="grid gap-1 text-sm text-[#6b7280] sm:grid-cols-2">
                    <p><strong className="text-[#374151]">Usuario:</strong> {user?.displayName ?? booking.userId}</p>
                    <p><strong className="text-[#374151]">Tecnico:</strong> {technician?.displayName ?? booking.technicianId}</p>
                    <p><strong className="text-[#374151]">Fecha:</strong> {formatDate(booking.scheduledDate)}</p>
                    <p><strong className="text-[#374151]">Total:</strong> {formatMoney(booking.totalPrice)}</p>
                  </div>
                  {booking.paymentId ? (
                    <p className="text-xs text-[#6b7280]">Payment ID: <span className="font-mono">{booking.paymentId}</span></p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/booking/${booking.id}`}>Ver detalle</Link>
                  </Button>
                  {booking.paymentLinkUrl ? (
                    <Button asChild variant="outline">
                      <a href={booking.paymentLinkUrl} target="_blank" rel="noreferrer">
                        <CreditCard className="mr-2 h-4 w-4" /> Pago
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() => cancelBooking(booking)}
                    disabled={!canCancel || busyId === booking.id}
                  >
                    <XCircle className="mr-2 h-4 w-4" /> Cancelar
                  </Button>
                  <Button
                    onClick={() => refundBooking(booking)}
                    disabled={!canRefund || busyId === booking.id || !booking.paymentId}
                    className="bg-amber-500 text-white hover:bg-amber-600"
                  >
                    <Receipt className="mr-2 h-4 w-4" /> Reembolsar
                  </Button>
                </div>
              </div>
            </article>
          )
        })}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-white p-8 text-center text-sm text-[#6b7280]">
            No encontramos reservas con los filtros actuales.
          </div>
        ) : null}
      </div>
    </section>
  )
}
