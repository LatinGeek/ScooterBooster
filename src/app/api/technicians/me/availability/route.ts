import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getTechnicianByUserId, updateTechnicianProfile } from "@/lib/db/technicians"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { getSession } from "@/lib/session"
import { assertTrustedOrigin } from "@/lib/security"
import { safeRevalidateTag } from "@/lib/revalidate"

const dayAvailabilitySchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
  isAvailable: z.boolean(),
})

const availabilitySchema = z.record(z.string(), dayAvailabilitySchema)
const validDays = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
])

function toMinutes(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":")
  return Number(hours) * 60 + Number(minutes)
}

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "technician" && session.role !== "admin") throw new ForbiddenError()

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) throw new NotFoundError("Perfil de técnico no encontrado")

  const body = (await req.json()) as Record<string, unknown>
  const parsed = availabilitySchema.safeParse(body.availability)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  for (const [day, entry] of Object.entries(parsed.data)) {
    if (!validDays.has(day)) {
      throw new ValidationError(`Día inválido: ${day}`)
    }
    if (entry.isAvailable && toMinutes(entry.start) >= toMinutes(entry.end)) {
      throw new ValidationError(`El horario de ${day} debe iniciar antes de finalizar`)
    }
  }

  const updated = await updateTechnicianProfile(tech.id, {
    availability: parsed.data,
  })

  safeRevalidateTag("technicians")

  return ok(updated)
})
