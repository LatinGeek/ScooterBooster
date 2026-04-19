import { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { SESSION_COOKIE_NAME } from "@/lib/session"
import { ok } from "@/lib/api-response"
import { withErrorHandling } from "@/lib/api-response"
import { enforceIpRateLimit } from "@/lib/ratelimit"
import { assertTrustedOrigin } from "@/lib/security"

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)
  await enforceIpRateLimit("authIp", req)

  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
  cookieStore.delete("__role")
  return ok({ message: "Sesión cerrada" })
})
