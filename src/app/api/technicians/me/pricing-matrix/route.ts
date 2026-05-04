import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getAllModels } from "@/lib/db/models"
import { getAllServices } from "@/lib/db/services"
import { getTechnicianByUserId, updateTechnicianProfile } from "@/lib/db/technicians"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { getSession } from "@/lib/session"
import { assertTrustedOrigin } from "@/lib/security"
import { safeRevalidateTag } from "@/lib/revalidate"
import { normalizeMatrixInput } from "@/lib/technician-matrix"

const technicianModelPricingSchema = z.object({
  price: z.number().min(0),
  currency: z.literal("UYU"),
  isAvailable: z.boolean(),
})

const pricingMatrixSchema = z.record(z.string(), z.record(z.string(), technicianModelPricingSchema))

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "technician" && session.role !== "admin") throw new ForbiddenError()

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) throw new NotFoundError("Perfil de técnico no encontrado")

  const body = (await req.json()) as Record<string, unknown>
  const parsed = pricingMatrixSchema.safeParse(body.pricingMatrix)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const [services, models] = await Promise.all([getAllServices(), getAllModels()])
  const serviceIds = new Set(services.map((service) => service.id))
  const modelIds = new Set(models.map((model) => model.id))

  for (const [serviceId, entries] of Object.entries(parsed.data)) {
    if (!serviceIds.has(serviceId)) {
      throw new ValidationError(`Servicio desconocido: ${serviceId}`)
    }
    for (const modelId of Object.keys(entries)) {
      if (!modelIds.has(modelId)) {
        throw new ValidationError(`Modelo desconocido: ${modelId}`)
      }
    }
  }

  const updated = await updateTechnicianProfile(tech.id, {
    pricingMatrix: normalizeMatrixInput(parsed.data),
  })

  safeRevalidateTag("technicians")

  return ok(updated)
})
