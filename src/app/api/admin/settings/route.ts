import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase-admin"
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors"
import logger from "@/lib/logger"

const CONFIG_DOC = adminDb.collection("config").doc("global")

const patchSchema = z.object({
  serviceFeePercentage: z
    .number()
    .int("El porcentaje debe ser un número entero")
    .min(0, "El porcentaje debe estar entre 0 y 50")
    .max(50, "El porcentaje debe estar entre 0 y 50"),
})

/** GET /api/admin/settings — read global platform settings */
export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const snap = await CONFIG_DOC.get()
  const data = snap.exists
    ? snap.data()!
    : { serviceFeePercentage: parseInt(process.env.SERVICE_FEE_PERCENTAGE ?? "10") }

  return ok(data)
})

/** PATCH /api/admin/settings — update global platform settings */
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body: unknown = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const now = new Date().toISOString()
  await CONFIG_DOC.set(
    { ...parsed.data, updatedAt: now, updatedBy: session.uid },
    { merge: true },
  )

  logger.info({ adminUid: session.uid, settings: parsed.data }, "Admin settings updated")

  return ok({ ...parsed.data, updatedAt: now })
})
