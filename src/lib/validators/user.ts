import { z } from "zod"

export const userRoleSchema = z.enum(["user", "technician", "admin"])

export const updateUserProfileSchema = z.object({
  displayName: z.string().min(2).max(100),
  phone: z
    .string()
    .regex(/^\+598\d{8}$/, "El teléfono debe tener formato +598XXXXXXXX")
    .optional()
    .nullable(),
})

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>
