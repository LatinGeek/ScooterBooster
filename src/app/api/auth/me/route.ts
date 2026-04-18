import { getSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase-admin"
import { ok, fail, withErrorHandling } from "@/lib/api-response"
import type { User } from "@/types"

export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) {
    return fail("No autenticado", 401)
  }

  const userDoc = await adminDb.collection("users").doc(session.uid).get()
  if (!userDoc.exists) {
    return fail("Usuario no encontrado", 404)
  }

  const userData = { uid: session.uid, ...userDoc.data() } as User
  return ok(userData)
})
