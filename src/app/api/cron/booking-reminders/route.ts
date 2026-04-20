import { NextRequest } from "next/server"
import { ok, fail, withErrorHandling } from "@/lib/api-response"
import { getSession } from "@/lib/session"
import { getConfirmedBookingsScheduledBetween, markBookingReminderSent } from "@/lib/db/bookings"
import { getServiceById } from "@/lib/db/services"
import { getTechnicianById } from "@/lib/db/technicians"
import { getUserById } from "@/lib/db/users"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { notify } from "@/lib/notifications"
import { sendBookingReminderEmail } from "@/lib/notification-emails"

function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return req.headers.get("authorization") === `Bearer ${cronSecret}`
}

function getTomorrowWindow() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() + 1)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  const isCron = isCronAuthorized(req)
  if (!isCron) {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return fail("No autorizado", 403)
    }
  }

  const { startIso, endIso } = getTomorrowWindow()
  const bookings = await getConfirmedBookingsScheduledBetween(startIso, endIso)
  const pendingReminders = bookings.filter((booking) => !booking.reminderSentAt)

  let processed = 0

  for (const booking of pendingReminders) {
    const [user, service, technician] = await Promise.all([
      getUserById(booking.userId),
      getServiceById(booking.serviceId),
      getTechnicianById(booking.technicianId),
    ])

    if (!user || !service || !technician) {
      continue
    }

    const scheduledDateLabel = new Date(booking.scheduledDate).toLocaleString("es-UY", {
      dateStyle: "full",
      timeStyle: "short",
    })

    await Promise.allSettled([
      notify({
        type: "bookingReminder",
        userId: booking.userId,
        bookingId: booking.id,
        serviceName: service.name,
        technicianName: technician.displayName,
        scheduledDateLabel,
      }),
      ...(user.email
        ? [
            sendBookingReminderEmail({
              to: user.email,
              bookingId: booking.id,
              serviceName: service.name,
              technicianName: technician.displayName,
              scheduledDate: scheduledDateLabel,
            }),
          ]
        : []),
      addAuditLogEntry({
        action: "booking_reminder_sent",
        actorUid: isCron ? "cron" : "admin-manual",
        targetType: "booking",
        targetId: booking.id,
        metadata: {
          scheduledDate: booking.scheduledDate,
          serviceId: booking.serviceId,
          technicianId: booking.technicianId,
        },
      }),
    ])

    await markBookingReminderSent(booking.id)
    processed++
  }

  return ok({
    processed,
    window: { startIso, endIso },
    skipped: bookings.length - processed,
  })
})
