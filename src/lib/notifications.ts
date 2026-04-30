import { createUserNotification } from "@/lib/db/notifications"
import type { BookingStatus, NotificationType } from "@/types"

type NotificationEvent =
  | {
      type: "bookingCreated"
      userId: string
      bookingId: string
      serviceName: string
      serviceFee: number
    }
  | {
      type: "bookingReminder"
      userId: string
      bookingId: string
      serviceName: string
      technicianName: string
      scheduledDateLabel: string
    }
  | {
      type: "bookingStatusChanged"
      userId: string
      bookingId: string
      newStatus: BookingStatus
    }

function buildBookingStatusCopy(status: BookingStatus): {
  type: NotificationType
  title: string
  body: string
} | null {
  switch (status) {
    case "confirmed":
      return {
        type: "booking_confirmed",
        title: "Reserva confirmada",
        body: "Tu técnico ya confirmó la reserva. Ya podés prepararte para el turno.",
      }
    case "in_progress":
      return {
        type: "booking_in_progress",
        title: "Servicio en curso",
        body: "Tu técnico marcó la reserva como en curso.",
      }
    case "completed":
      return {
        type: "booking_completed",
        title: "Servicio completado",
        body: "Tu reserva fue completada. Si querés, ya podés dejar una reseña.",
      }
    case "cancelled_by_technician":
      return {
        type: "booking_cancelled",
        title: "Reserva cancelada",
        body: "El técnico canceló esta reserva. Revisá el detalle para coordinar una alternativa.",
      }
    case "cancelled_by_user":
      return {
        type: "booking_cancelled",
        title: "Reserva cancelada",
        body: "La reserva fue cancelada y ya actualizamos su estado en ScooterBooster.",
      }
    default:
      return null
  }
}

export async function notify(event: NotificationEvent) {
  if (event.type === "bookingCreated") {
    await createUserNotification({
      userId: event.userId,
      type: "booking_pending_payment",
      title: "Reserva creada",
      body: `Tu reserva para ${event.serviceName} ya fue creada. Falta completar el pago de ${new Intl.NumberFormat(
        "es-UY",
        {
          style: "currency",
          currency: "UYU",
          maximumFractionDigits: 0,
        },
      ).format(event.serviceFee)} para confirmar tu turno. El pago del servicio al técnico se coordina por fuera de ScooterBooster.`,
      href: `/booking/${event.bookingId}`,
    })
    return
  }

  if (event.type === "bookingReminder") {
    await createUserNotification({
      userId: event.userId,
      type: "booking_reminder",
      title: "Recordatorio de reserva",
      body: `Mañana ${event.scheduledDateLabel} tenés ${event.serviceName} con ${event.technicianName}.`,
      href: `/booking/${event.bookingId}`,
    })
    return
  }

  const copy = buildBookingStatusCopy(event.newStatus)
  if (!copy) return

  await createUserNotification({
    userId: event.userId,
    type: copy.type,
    title: copy.title,
    body: copy.body,
    href: `/booking/${event.bookingId}`,
  })
}

