import { z } from "zod"

export const serviceCategorySchema = z.enum([
  "speed-limit",
  "firmware",
  "cruise-control",
  "maintenance",
])

export const createServiceSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, "El slug solo puede contener letras minúsculas, números y guiones"),
  description: z.string().min(10).max(500),
  category: serviceCategorySchema,
  estimatedDuration: z.number().int().positive(),
  requiresDisclaimer: z.boolean().default(false),
  isActive: z.boolean().default(true),
})

export type ServiceCategory = z.infer<typeof serviceCategorySchema>
export type CreateServiceInput = z.infer<typeof createServiceSchema>
