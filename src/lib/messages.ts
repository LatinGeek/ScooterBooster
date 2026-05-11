import { formatWhatsAppLink } from "@/lib/utils"

export interface TechnicianContactMessageInput {
  bookingId: string
  scooterModel: string
  service: string
  bookingDateTime: string
}

export function formatFriendlySpanishDateTime(value: string) {
  const formatted = new Intl.DateTimeFormat("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Montevideo",
  }).format(new Date(value))

  return formatted.replace(/^([a-záéíóúñ]+), /i, "$1 ")
}

export function buildTechnicianContactMessage({
  bookingId,
  scooterModel,
  service,
  bookingDateTime,
}: TechnicianContactMessageInput) {
  return [
    `Hola, tengo una reserva en ScooterBooster (ID: ${bookingId})`,
    "",
    `Modelo de monopatín: ${scooterModel}`,
    `Servicio: ${service}`,
    `Día y hora de preferencia: ${formatFriendlySpanishDateTime(bookingDateTime)}`,
  ].join("\n")
}

export const WA_MESSAGES = {
  userContactTechnician: (input: TechnicianContactMessageInput) =>
    buildTechnicianContactMessage(input),

  technicianContactUser: (bookingId: string) =>
    `Hola, soy tu tÃ©cnico en ScooterBooster para la reserva ${bookingId}. Quisiera coordinar algunos detalles.`,

  reviewRequest: (technicianName: string) =>
    `Hola. Esperamos que hayas quedado satisfecho con el servicio de ${technicianName}. Â¿PodÃ©s dejarnos una reseÃ±a en ScooterBooster?`,

  bookingConfirmation: (date: string, technicianName: string) =>
    `Tu reserva en ScooterBooster fue confirmada para el ${date} con ${technicianName}. Â¡Nos vemos!`,

  bookingReminder: (date: string, technicianName: string) =>
    `Recordatorio de tu reserva en ScooterBooster: maÃ±ana ${date} te espera ${technicianName}. Si necesitÃ¡s recoordinar, escribile por acÃ¡.`,
} as const

export function buildWhatsAppUrl(phoneNumber: string, message: string) {
  return formatWhatsAppLink(phoneNumber, message)
}
