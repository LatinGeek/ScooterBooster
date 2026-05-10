import { revalidateTag } from "next/cache"
import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { createBrand, deleteBrand, getAllBrands, updateBrand } from "@/lib/db/brands"
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors"
import { getSession } from "@/lib/session"
import { sanitizeOptionalPlainText, sanitizePlainText } from "@/lib/sanitize"
import { assertTrustedOrigin } from "@/lib/security"

const brandCreateSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  logoURL: z.url("La URL del logo no es válida").nullable().optional(),
  isActive: z.boolean().default(true),
})

const brandUpdateSchema = brandCreateSchema.extend({
  id: z.string().min(1),
})

const brandDeleteSchema = z.object({
  id: z.string().min(1),
})

export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  return ok(await getAllBrands())
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body: unknown = await req.json()
  const parsed = brandCreateSchema.safeParse({
    ...(body as Record<string, unknown>),
    name:
      typeof (body as Record<string, unknown>).name === "string"
        ? sanitizePlainText((body as Record<string, unknown>).name as string)
        : (body as Record<string, unknown>).name,
    logoURL:
      typeof (body as Record<string, unknown>).logoURL === "string"
        ? sanitizeOptionalPlainText((body as Record<string, unknown>).logoURL as string)
        : (body as Record<string, unknown>).logoURL,
  })

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const brand = await createBrand(parsed.data)
  revalidateTag("brands", { expire: 0 })

  await addAuditLogEntry({
    action: "catalog_brand_created",
    actorUid: session.uid,
    targetType: "brand",
    targetId: brand.id,
    metadata: { name: brand.name, isActive: brand.isActive },
  })

  return ok(brand, 201)
})

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body: unknown = await req.json()
  const parsed = brandUpdateSchema.safeParse({
    ...(body as Record<string, unknown>),
    name:
      typeof (body as Record<string, unknown>).name === "string"
        ? sanitizePlainText((body as Record<string, unknown>).name as string)
        : (body as Record<string, unknown>).name,
    logoURL:
      typeof (body as Record<string, unknown>).logoURL === "string"
        ? sanitizeOptionalPlainText((body as Record<string, unknown>).logoURL as string)
        : (body as Record<string, unknown>).logoURL,
  })

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const brand = await updateBrand(parsed.data.id, parsed.data)
  revalidateTag("brands", { expire: 0 })

  await addAuditLogEntry({
    action: "catalog_brand_updated",
    actorUid: session.uid,
    targetType: "brand",
    targetId: brand.id,
    metadata: { name: brand.name, isActive: brand.isActive },
  })

  return ok(brand)
})

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body: unknown = await req.json()
  const parsed = brandDeleteSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  await deleteBrand(parsed.data.id)
  revalidateTag("brands", { expire: 0 })
  revalidateTag("services", { expire: 0 })

  await addAuditLogEntry({
    action: "catalog_brand_deleted",
    actorUid: session.uid,
    targetType: "brand",
    targetId: parsed.data.id,
    metadata: {},
  })

  return ok({ id: parsed.data.id })
})
