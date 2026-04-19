import { z } from "zod"

export const createBookingSchema = z.object({
  technicianId: z.string().min(1),
  serviceId: z.string().min(1),
  scooterModelId: z.string().min(1),
  scheduledDate: z.string().datetime({ message: "Fecha inválida" }),
  notes: z.string().max(500).nullable().optional(),
  disclaimerAccepted: z.boolean().optional(),
})

export const cancelBookingSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.string().max(300).optional(),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>
