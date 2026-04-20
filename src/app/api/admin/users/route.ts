import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { adminRestoreUser, adminSoftDeleteUser, getUserById } from "@/lib/db/users"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { adminAuth } from "@/lib/firebase-admin"
import { getSession } from "@/lib/session"
import { assertTrustedOrigin } from "@/lib/security"

const patchSchema = z.object({
  uid: z.string().min(1),
  action: z.enum(["soft_delete", "restore"]),
})

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

  const user = await getUserById(parsed.data.uid)
  if (!user) throw new NotFoundError("Usuario no encontrado")

  if (parsed.data.uid === session.uid) {
    throw new ValidationError("No podes suspender ni restaurar tu propio usuario desde este panel")
  }

  if (parsed.data.action === "soft_delete") {
    if (user.role === "admin") {
      throw new ValidationError("Por seguridad, los admins solo pueden desactivarse manualmente fuera de este panel")
    }

    const updated = await adminSoftDeleteUser(user.uid)
    await adminAuth.updateUser(user.uid, { disabled: true })
    await addAuditLogEntry({
      action: "admin_user_soft_deleted",
      actorUid: session.uid,
      targetType: "user",
      targetId: user.uid,
      metadata: { email: user.email, previousRole: user.role },
    })

    return ok(updated)
  }

  const restored = await adminRestoreUser(user.uid)
  await adminAuth.updateUser(user.uid, { disabled: false })
  await addAuditLogEntry({
    action: "admin_user_restored",
    actorUid: session.uid,
    targetType: "user",
    targetId: user.uid,
    metadata: { email: user.email, role: user.role },
  })

  return ok(restored)
})
