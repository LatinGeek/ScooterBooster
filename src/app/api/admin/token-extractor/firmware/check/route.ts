import type { NextRequest } from "next/server"
import { fail, ok, withErrorHandling } from "@/lib/api-response"
import { assertTrustedOrigin } from "@/lib/security"
import { requireToolUser, XiaomiOperationError } from "@/lib/token-extractor/api"
import { XiaomiCloudClient, XIAOMI_SERVERS, type XiaomiServer } from "@/lib/token-extractor/client"
import { readXiaomiSession } from "@/lib/token-extractor/session"

export const dynamic = "force-dynamic"

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)
  await requireToolUser()
  const session = await readXiaomiSession()
  if (!session) return fail("Inicia sesión en Xiaomi Cloud primero", 401)
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const did = String(body.did ?? "").trim()
  if (!did) return fail("Falta el DID del dispositivo", 400)
  const model = String(body.model ?? "").trim()
  const server = XIAOMI_SERVERS.includes(body.server as XiaomiServer)
    ? (body.server as XiaomiServer)
    : undefined
  const client = new XiaomiCloudClient({ session })
  try {
    return ok(await client.findFirmware(did, model, server))
  } catch (error) {
    throw new XiaomiOperationError(error instanceof Error ? error.message : "Error consultando firmware")
  }
})
