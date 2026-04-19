import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getSession } from "@/lib/session"
import { getTechnicianByUserId, updateTechnicianProfile } from "@/lib/db/technicians"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"

const dayAvailabilitySchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
  isAvailable: z.boolean(),
})

const patchSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  phone: z
    .string()
    .regex(/^\+598\d{8}$/, "El teléfono debe tener formato +598XXXXXXXX")
    .optional(),
  whatsappNumber: z
    .string()
    .regex(/^598\d{8}$/, "WhatsApp debe tener formato 598XXXXXXXX (sin +)")
    .optional(),
  location: z.string().max(100).optional(),
  services: z.array(z.string()).optional(),
  supportedBrands: z.array(z.string()).optional(),
  availability: z.record(z.string(), dayAvailabilitySchema).optional(),
  pricing: z
    .record(
      z.string(),
      z.object({ basePrice: z.number().min(0), currency: z.literal("UYU") })
    )
    .optional(),
  isActive: z.boolean().optional(),
})

/** GET /api/technicians/me — return own technician profile */
export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "technician" && session.role !== "admin") throw new ForbiddenError()

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) throw new NotFoundError("Perfil de técnico no encontrado")

  return ok(tech)
})

/** PATCH /api/technicians/me — update own technician profile */
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "technician" && session.role !== "admin") throw new ForbiddenError()

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) throw new NotFoundError("Perfil de técnico no encontrado")

  const body: unknown = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const updated = await updateTechnicianProfile(tech.id, parsed.data)
  return ok(updated)
})
