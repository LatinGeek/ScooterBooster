import { z } from "zod"

const availabilityDaySchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
})

export const createTechnicianSchema = z.object({
  displayName: z.string().min(2).max(100),
  bio: z.string().min(10).max(500),
  phone: z.string().regex(/^\+598\d{8}$/, "El teléfono debe tener formato +598XXXXXXXX"),
  whatsappNumber: z.string().regex(/^\+598\d{8}$/, "El WhatsApp debe tener formato +598XXXXXXXX"),
  location: z.string().min(2).max(100),
  services: z.array(z.string()).min(1, "Debes seleccionar al menos un servicio"),
  supportedBrands: z.array(z.string()).min(1, "Debes seleccionar al menos una marca"),
  availability: z
    .object({
      monday: availabilityDaySchema.optional(),
      tuesday: availabilityDaySchema.optional(),
      wednesday: availabilityDaySchema.optional(),
      thursday: availabilityDaySchema.optional(),
      friday: availabilityDaySchema.optional(),
      saturday: availabilityDaySchema.optional(),
      sunday: availabilityDaySchema.optional(),
    })
    .optional(),
})

export const updateTechnicianPricingSchema = z.object({
  pricing: z.record(
    z.string(),
    z.object({
      basePrice: z.number().positive("El precio debe ser mayor a 0"),
      currency: z.literal("UYU"),
    })
  ),
})

export type CreateTechnicianInput = z.infer<typeof createTechnicianSchema>
export type UpdateTechnicianPricingInput = z.infer<typeof updateTechnicianPricingSchema>
