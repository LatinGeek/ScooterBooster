import type { NextRequest } from "next/server"
import { ok, withErrorHandling } from "@/lib/api-response"
import logger from "@/lib/logger"
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
  const client = new XiaomiCloudClient()
  try {
    const result = await client.qrStart()
    if (result.status === "challenge") {
      const image = result.data.imageDataUrl
      logger.info(
        {
          scope: "token-extractor",
          phase: "qr_start",
          imageBytes: typeof image === "string" ? image.length : 0,
          hasLoginUrl: Boolean(result.data.loginUrl),
        },
        "QR challenge generated"
      )
    }
    return applyLoginResult(ok(challengePayload(result)), result)
  } catch (error) {
    throw new XiaomiOperationError(error instanceof Error ? error.message : "No se pudo generar el QR")
  }
})
