import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { getAllReviews, setReviewHidden } from "@/lib/db/reviews"
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors"
import { getSession } from "@/lib/session"
import { assertTrustedOrigin } from "@/lib/security"

const patchSchema = z.object({
  id: z.string().min(1),
  isHidden: z.boolean(),
})

export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  return ok(await getAllReviews())
})

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body: unknown = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  await setReviewHidden(parsed.data.id, parsed.data.isHidden, session.uid)
  await addAuditLogEntry({
    action: parsed.data.isHidden ? "review_hidden" : "review_restored",
    actorUid: session.uid,
    targetType: "review",
    targetId: parsed.data.id,
    metadata: {
      isHidden: parsed.data.isHidden,
    },
  })

  return ok({ id: parsed.data.id, isHidden: parsed.data.isHidden })
})
