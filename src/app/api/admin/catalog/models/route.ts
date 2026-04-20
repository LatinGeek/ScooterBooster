import { revalidateTag } from "next/cache"
import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { getAllModels, updateModel, createModel } from "@/lib/db/models"
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors"
import { getSession } from "@/lib/session"
import { sanitizeOptionalPlainText, sanitizePlainText } from "@/lib/sanitize"
import { assertTrustedOrigin } from "@/lib/security"

const specsSchema = z.object({
  maxSpeed: z.number().int().min(10).max(120),
  range: z.number().int().min(5).max(300),
  battery: z.string().min(2).max(80),
  motor: z.string().min(2).max(80),
  weight: z.number().int().min(5).max(80),
})

const modelBaseSchema = z.object({
  brandId: z.string().min(1, "Selecciona una marca"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(80),
  imageURL: z.url("La URL de imagen no es válida").nullable().optional(),
  specs: specsSchema,
  compatibleServices: z.array(z.string().min(1)).min(1, "Selecciona al menos un servicio compatible"),
  isActive: z.boolean().default(true),
})

const modelUpdateSchema = modelBaseSchema.extend({
  id: z.string().min(1),
})

function sanitizeModelBody(body: Record<string, unknown>) {
  return {
    ...body,
    name: typeof body.name === "string" ? sanitizePlainText(body.name) : body.name,
    imageURL: typeof body.imageURL === "string" ? sanitizeOptionalPlainText(body.imageURL) : body.imageURL,
    specs: typeof body.specs === "object" && body.specs !== null
      ? {
          ...(body.specs as Record<string, unknown>),
          battery:
            typeof (body.specs as Record<string, unknown>).battery === "string"
              ? sanitizePlainText((body.specs as Record<string, unknown>).battery as string)
              : (body.specs as Record<string, unknown>).battery,
          motor:
            typeof (body.specs as Record<string, unknown>).motor === "string"
              ? sanitizePlainText((body.specs as Record<string, unknown>).motor as string)
              : (body.specs as Record<string, unknown>).motor,
        }
      : body.specs,
  }
}

export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  return ok(await getAllModels())
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body = (await req.json()) as Record<string, unknown>
  const parsed = modelBaseSchema.safeParse(sanitizeModelBody(body))
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const model = await createModel(parsed.data)
  revalidateTag("brands", { expire: 0 })
  revalidateTag("services", { expire: 0 })

  await addAuditLogEntry({
    action: "catalog_model_created",
    actorUid: session.uid,
    targetType: "model",
    targetId: model.id,
    metadata: { name: model.name, brandId: model.brandId, isActive: model.isActive },
  })

  return ok(model, 201)
})

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body = (await req.json()) as Record<string, unknown>
  const parsed = modelUpdateSchema.safeParse(sanitizeModelBody(body))
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const model = await updateModel(parsed.data.id, parsed.data)
  revalidateTag("brands", { expire: 0 })
  revalidateTag("services", { expire: 0 })

  await addAuditLogEntry({
    action: "catalog_model_updated",
    actorUid: session.uid,
    targetType: "model",
    targetId: model.id,
    metadata: { name: model.name, brandId: model.brandId, isActive: model.isActive },
  })

  return ok(model)
})
