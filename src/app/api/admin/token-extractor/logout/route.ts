import type { NextRequest } from "next/server"
import { ok, withErrorHandling } from "@/lib/api-response"
import { assertTrustedOrigin } from "@/lib/security"
import { requireToolUser } from "@/lib/token-extractor/api"
import { clearXiaomiSession } from "@/lib/token-extractor/session"

export const dynamic = "force-dynamic"

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)
  await requireToolUser()
  const response = ok({ authenticated: false })
  clearXiaomiSession(response)
  return response
})
