import { NextRequest } from "next/server"
import { z } from "zod"
import logger from "@/lib/logger"
import { fail, ok, withErrorHandling } from "@/lib/api-response"
import { enforceIpRateLimit } from "@/lib/ratelimit"
import { assertTrustedOrigin } from "@/lib/security"

const bodySchema = z.object({
  scope: z.string().min(1),
  code: z.string().min(1).optional(),
  stage: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)
  await enforceIpRateLimit("authIp", req)

  const body = (await req.json()) as unknown
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return fail("Payload inválido", 400)
  }

  logger.warn(
    {
      route: req.nextUrl.pathname,
      origin: req.headers.get("origin"),
      ...parsed.data,
    },
    "Client error reported"
  )

  return ok({ received: true })
})
