import { revalidateTag } from "next/cache"
import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { createService, getAllServices, updateService } from "@/lib/db/services"
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors"
import { getSession } from "@/lib/session"
import { sanitizePlainText } from "@/lib/sanitize"
import { assertTrustedOrigin } from "@/lib/security"

const serviceBaseSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(80),
  description: z.string().min(20, "La descripción debe tener al menos 20 caracteres").max(500),
  category: z.enum(["speed-limit", "firmware", "cruise-control", "maintenance"]),
  estimatedDuration: z.number().int().min(15).max(480),
  requiresDisclaimer: z.boolean(),
  isActive: z.boolean().default(true),
})

const serviceUpdateSchema = serviceBaseSchema.extend({
  id: z.string().min(1),
})

function sanitizeServiceBody(body: Record<string, unknown>) {
  return {
    ...body,
    name: typeof body.name === "string" ? sanitizePlainText(body.name) : body.name,
    description:
      typeof body.description === "string" ? sanitizePlainText(body.description) : body.description,
  }
}

export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  return ok(await getAllServices())
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body = (await req.json()) as Record<string, unknown>
  const parsed = serviceBaseSchema.safeParse(sanitizeServiceBody(body))
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const service = await createService(parsed.data)
  revalidateTag("services", { expire: 0 })

  await addAuditLogEntry({
    action: "catalog_service_created",
    actorUid: session.uid,
    targetType: "service",
    targetId: service.id,
    metadata: { name: service.name, category: service.category, isActive: service.isActive },
  })

  return ok(service, 201)
})

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body = (await req.json()) as Record<string, unknown>
  const parsed = serviceUpdateSchema.safeParse(sanitizeServiceBody(body))
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const service = await updateService(parsed.data.id, parsed.data)
  revalidateTag("services", { expire: 0 })

  await addAuditLogEntry({
    action: "catalog_service_updated",
    actorUid: session.uid,
    targetType: "service",
    targetId: service.id,
    metadata: { name: service.name, category: service.category, isActive: service.isActive },
  })

  return ok(service)
})
