import * as React from "react"
import {
  BookingCancelledEmail,
  BookingCompletedEmail,
  BookingConfirmedEmail,
  BookingCreatedEmail,
  BookingReminderEmail,
  TechnicianApprovedEmail,
  TechnicianRejectedEmail,
} from "@/emails/templates"
import { sendEmail } from "@/lib/email"

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://scooterbooster.uy"
}

interface BookingEmailBase {
  to: string
  bookingId: string
  serviceName: string
  technicianName: string
  scheduledDate: string
}

export async function sendBookingCreatedEmail(
  input: BookingEmailBase & { totalPrice: string },
) {
  return sendEmail({
    to: input.to,
    subject: "Tu reserva fue creada en ScooterBooster",
    react: React.createElement(BookingCreatedEmail, {
      ...input,
      detailUrl: `${appUrl()}/booking/${input.bookingId}`,
    }),
  })
}

export async function sendBookingConfirmedEmail(input: BookingEmailBase) {
  return sendEmail({
    to: input.to,
    subject: "Tu reserva ya está confirmada",
    react: React.createElement(BookingConfirmedEmail, {
      ...input,
      detailUrl: `${appUrl()}/booking/${input.bookingId}`,
    }),
  })
}

export async function sendBookingReminderEmail(input: BookingEmailBase) {
  return sendEmail({
    to: input.to,
    subject: "Recordatorio de tu reserva de mañana",
    react: React.createElement(BookingReminderEmail, {
      ...input,
      detailUrl: `${appUrl()}/booking/${input.bookingId}`,
    }),
  })
}

export async function sendBookingCompletedEmail(input: BookingEmailBase) {
  return sendEmail({
    to: input.to,
    subject: "Tu servicio fue completado",
    react: React.createElement(BookingCompletedEmail, {
      ...input,
      detailUrl: `${appUrl()}/booking/${input.bookingId}`,
    }),
  })
}

export async function sendBookingCancelledEmail(
  input: BookingEmailBase & { reason: string },
) {
  return sendEmail({
    to: input.to,
    subject: "Tu reserva fue cancelada",
    react: React.createElement(BookingCancelledEmail, {
      ...input,
      reason: input.reason,
      detailUrl: `${appUrl()}/booking/${input.bookingId}`,
    }),
  })
}

export async function sendTechnicianApprovedEmail(input: {
  to: string
  technicianName: string
}) {
  return sendEmail({
    to: input.to,
    subject: "Tu perfil técnico fue aprobado",
    react: React.createElement(TechnicianApprovedEmail, {
      technicianName: input.technicianName,
      dashboardUrl: `${appUrl()}/dashboard/technician`,
    }),
  })
}

export async function sendTechnicianRejectedEmail(input: {
  to: string
  technicianName: string
  reason: string
}) {
  return sendEmail({
    to: input.to,
    subject: "Tu solicitud necesita ajustes",
    react: React.createElement(TechnicianRejectedEmail, {
      technicianName: input.technicianName,
      reason: input.reason,
      applyUrl: `${appUrl()}/technicians/apply`,
    }),
  })
}
