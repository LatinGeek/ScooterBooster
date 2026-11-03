import { ok, withErrorHandling } from "@/lib/api-response"
import { requireToolUser } from "@/lib/token-extractor/api"
import { XIAOMI_SERVERS } from "@/lib/token-extractor/client"
import { readXiaomiSession } from "@/lib/token-extractor/session"

export const dynamic = "force-dynamic"

export const GET = withErrorHandling(async () => {
  const user = await requireToolUser()
  const session = await readXiaomiSession()
  return ok({
    authenticated: Boolean(session),
    userId: session?.userId ?? null,
    role: user.role,
    servers: XIAOMI_SERVERS,
  })
})
