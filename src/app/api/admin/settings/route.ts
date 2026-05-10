import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors"
import { adminDb } from "@/lib/firebase-admin"
import logger from "@/lib/logger"
import { DEFAULT_SERVICE_FEE_AMOUNT } from "@/lib/pricing"
import { assertTrustedOrigin } from "@/lib/security"
import { getSession } from "@/lib/session"

const CONFIG_DOC = adminDb.collection("config").doc("global")

const patchSchema = z.object({
  serviceFeeAmount: z
    .number()
    .int("El monto debe ser un numero entero")
    .min(0, "El monto no puede ser negativo"),
})

/** GET /api/admin/settings - read global platform settings */
export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const snap = await CONFIG_DOC.get()
  const data = snap.exists ? snap.data()! : { serviceFeeAmount: DEFAULT_SERVICE_FEE_AMOUNT }

  return ok(data)
})

/** PATCH /api/admin/settings - update global platform settings */
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body: unknown = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos invalidos")
  }

  const now = new Date().toISOString()
  await CONFIG_DOC.set({ ...parsed.data, updatedAt: now, updatedBy: session.uid }, { merge: true })

  logger.info({ adminUid: session.uid, settings: parsed.data }, "Admin settings updated")

  return ok({ ...parsed.data, updatedAt: now })
})
