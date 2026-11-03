import type { NextRequest } from "next/server"
import { fail, ok, withErrorHandling } from "@/lib/api-response"
import { enforceIpRateLimit } from "@/lib/ratelimit"
import { assertTrustedOrigin } from "@/lib/security"
import { requireToolUser, XiaomiOperationError } from "@/lib/token-extractor/api"
import { XiaomiCloudClient } from "@/lib/token-extractor/client"
import { applyLoginResult, challengePayload } from "@/lib/token-extractor/session"

export const dynamic = "force-dynamic"

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)
  await requireToolUser()
  await enforceIpRateLimit("authIp", req)
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const username = String(body.username ?? "").trim()
  const password = String(body.password ?? "")
  const captchaCode = typeof body.captchaCode === "string" ? body.captchaCode : undefined
  if (!username || !password) return fail("Usuario y contraseña son obligatorios", 400)

  const client = new XiaomiCloudClient()
  try {
    const result = await client.loginPassword(username, password, captchaCode)
    return applyLoginResult(ok(challengePayload(result)), result)
  } catch (error) {
    throw new XiaomiOperationError(error instanceof Error ? error.message : "Login fallido")
  }
})
