import { cookies } from "next/headers"
import { SESSION_COOKIE_NAME } from "@/lib/session"
import { ok } from "@/lib/api-response"
import { withErrorHandling } from "@/lib/api-response"

export const POST = withErrorHandling(async () => {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  cookieStore.delete("__role")
  return ok({ message: "Sesión cerrada" })
})
