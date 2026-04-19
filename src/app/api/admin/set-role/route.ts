import { NextRequest } from "next/server"
import { z } from "zod"
import { adminAuth } from "@/lib/firebase-admin"
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

  // Set custom claim on the target user
  await adminAuth.setCustomUserClaims(uid, { role })

  return ok({ message: `Rol '${role}' asignado correctamente` })
})
