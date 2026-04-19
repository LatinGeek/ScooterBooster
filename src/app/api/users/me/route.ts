import { NextRequest } from "next/server"
import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import { getSession } from "@/lib/session"
import { ok, fail, withErrorHandling } from "@/lib/api-response"
import { assertTrustedOrigin } from "@/lib/security"
import type { User } from "@/types"

const patchSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  phone: z
    .string()
    .regex(/^\+598\d{8}$/, "El teléfono debe tener formato +598XXXXXXXX")
    .optional()
    .nullable(),
  whatsappConsent: z.boolean().optional(),
})

// GET /api/users/me — return current authenticated user
export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) return fail("No autenticado", 401)

  const snap = await adminDb.collection("users").doc(session.uid).get()
  if (!snap.exists) return fail("Usuario no encontrado", 404)

  return ok({ uid: session.uid, ...snap.data() } as User)
})

// DELETE /api/users/me — soft-delete the account.
// Sets deletedAt (now) + scheduledDeletionAt (30 days) and clears PII immediately.
// Hard-purge is done by /api/admin/users/purge-deleted (cron, runs daily).
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) return fail("No autenticado", 401)

  const now = new Date()
  const scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  await adminDb.collection("users").doc(session.uid).update({
    // Soft-delete markers
    deletedAt: now.toISOString(),
    scheduledDeletionAt: scheduled.toISOString(),
    updatedAt: now.toISOString(),
    // Clear PII immediately — phone is the only sensitive stored field
    phone: null,
    whatsappConsent: false,
  })

  return ok({ message: "Cuenta eliminada. Tus datos serán borrados definitivamente en 30 días." })
})

// PATCH /api/users/me — update profile fields
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) return fail("No autenticado", 401)

  const body = (await req.json()) as unknown
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues
    const msg = issues[0]?.message ?? "Datos inválidos"
    return fail(msg, 400)
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  }
  if (parsed.data.displayName !== undefined) updates["displayName"] = parsed.data.displayName
  if (parsed.data.phone !== undefined) updates["phone"] = parsed.data.phone
  if (parsed.data.whatsappConsent !== undefined)
    updates["whatsappConsent"] = parsed.data.whatsappConsent

  await adminDb.collection("users").doc(session.uid).update(updates)

  const updated = await adminDb.collection("users").doc(session.uid).get()
  return ok({ uid: session.uid, ...updated.data() } as User)
})
