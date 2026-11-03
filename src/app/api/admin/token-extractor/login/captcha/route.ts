import type { NextRequest } from "next/server"
import { fail, ok, withErrorHandling } from "@/lib/api-response"
import { enforceIpRateLimit } from "@/lib/ratelimit"
import { assertTrustedOrigin } from "@/lib/security"
import { requireToolUser, XiaomiOperationError } from "@/lib/token-extractor/api"
import { XiaomiCloudClient } from "@/lib/token-extractor/client"
import {
  applyLoginResult,
  challengePayload,
  readPending,
} from "@/lib/token-extractor/session"

export const dynamic = "force-dynamic"

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)
  await requireToolUser()
  await enforceIpRateLimit("authIp", req)
  const pending = await readPending()
  if (!pending || pending.kind !== "captcha") return fail("No hay un captcha pendiente", 400)
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const code = String(body.code ?? "").trim()
  if (!code) return fail("Falta el código del captcha", 400)
  const client = new XiaomiCloudClient({ pending })
  try {
    const result = await client.retryCaptcha(code)
    return applyLoginResult(ok(challengePayload(result)), result)
  } catch (error) {
    throw new XiaomiOperationError(error instanceof Error ? error.message : "Captcha rechazado")
  }
})
