// Pre-filled WhatsApp message templates (Spanish)

export const WA_MESSAGES = {
  userContactTechnician: (bookingId: string) =>
    `Hola, tengo una reserva en ScooterBooster (ID: ${bookingId}). Quisiera consultarte algo.`,

  technicianContactUser: (bookingId: string) =>
    `Hola, soy tu técnico en ScooterBooster para la reserva ${bookingId}. Quisiera coordinar algunos detalles.`,

  reviewRequest: (technicianName: string) =>
    `Hola! Esperamos que hayas quedado satisfecho con el servicio de ${technicianName}. ¿Podés dejarnos una reseña en ScooterBooster?`,

  bookingConfirmation: (date: string, technicianName: string) =>
    `Tu reserva en ScooterBooster fue confirmada para el ${date} con ${technicianName}. ¡Nos vemos!`,
} as const
