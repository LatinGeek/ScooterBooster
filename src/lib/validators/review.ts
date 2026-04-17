import { z } from "zod"

export const createReviewSchema = z.object({
  bookingId: z.string().min(1),
  technicianId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .min(10, "El comentario debe tener al menos 10 caracteres")
    .max(500, "El comentario no puede superar los 500 caracteres"),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>
