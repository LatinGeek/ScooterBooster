import type { NextRequest } from "next/server"
import { fail, ok, withErrorHandling } from "@/lib/api-response"
import logger from "@/lib/logger"
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
  const requested = Array.isArray(body.servers)
    ? body.servers.filter((value): value is XiaomiServer => XIAOMI_SERVERS.includes(value as XiaomiServer))
    : []
  const servers = requested.length ? requested : [...XIAOMI_SERVERS]
  const pin = typeof body.pin === "string" && body.pin ? body.pin.slice(0, 32) : undefined
  const client = new XiaomiCloudClient({ session })
  try {
    const result = await client.scan(servers, pin)
    logger.info(
      {
        scope: "token-extractor",
        phase: "scan",
        servers: result.servers.map((entry) => ({
          server: entry.server,
          homeCount: entry.homeCount,
          deviceCount: entry.devices.length,
          errorCount: entry.errors.length,
        })),
        totalDevices: result.totalDevices,
      },
      "Xiaomi Cloud region scan completed"
    )
    return ok(result)
  } catch (error) {
    throw new XiaomiOperationError(error instanceof Error ? error.message : "Error escaneando regiones")
  }
})
