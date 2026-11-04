import { fail, ok, withErrorHandling } from "@/lib/api-response"
import logger from "@/lib/logger"
import { requireToolUser, XiaomiOperationError } from "@/lib/token-extractor/api"
import { XiaomiCloudClient } from "@/lib/token-extractor/client"
import {
  applyLoginResult,
  challengePayload,
  readPending,
} from "@/lib/token-extractor/session"

export const dynamic = "force-dynamic"

export const GET = withErrorHandling(async () => {
  await requireToolUser()
  const pending = await readPending()
  if (!pending || pending.kind !== "qr") return fail("No hay un QR pendiente", 400)
  const client = new XiaomiCloudClient({ pending })
  try {
    const result = await client.qrPoll()
    logger.info(
      {
        scope: "token-extractor",
        phase: "qr_poll",
        status: result.status,
        ...(result.status === "challenge" ? result.data : { hasUserId: Boolean(result.session.userId) }),
      },
      result.status === "ok" ? "QR login completed" : "QR still pending"
    )
    return applyLoginResult(ok(challengePayload(result)), result)
  } catch (error) {
    throw new XiaomiOperationError(error instanceof Error ? error.message : "Error consultando el QR")
  }
})
