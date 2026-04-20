import { NextRequest } from "next/server"
import { z } from "zod"
import { adminAuth } from "@/lib/firebase-admin"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { updateUserRole } from "@/lib/db/users"
import { getSession } from "@/lib/session"
import { ok, fail, withErrorHandling } from "@/lib/api-response"
import { assertTrustedOrigin } from "@/lib/security"

const bodySchema = z.object({
  uid: z.string().min(1),
  role: z.enum(["user", "technician", "admin"]),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  // Only admins can set roles
  const session = await getSession()
  if (!session) return fail("No autenticado", 401)
  const callerRole = session["role"] as string | undefined
  if (callerRole !== "admin") return fail("Acceso denegado", 403)

  const body = (await req.json()) as unknown
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return fail("Datos inválidos", 400)

  const { uid, role } = parsed.data
  if (uid === session.uid && role !== "admin") {
    return fail("No podés quitarte el rol admin desde este panel.", 400)
  }

  // Set custom claim on the target user
  await adminAuth.setCustomUserClaims(uid, { role })
  await updateUserRole(uid, role)
  await addAuditLogEntry({
    action: "admin_user_role_updated",
    actorUid: session.uid,
    targetType: "user",
    targetId: uid,
    metadata: { role },
  })

  return ok({ message: `Rol '${role}' asignado correctamente` })
})
