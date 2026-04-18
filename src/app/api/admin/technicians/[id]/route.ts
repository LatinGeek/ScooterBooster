import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getSession } from "@/lib/session"
import { getTechnicianById, setTechnicianApproval } from "@/lib/db/technicians"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import logger from "@/lib/logger"

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
})

/** PATCH /api/admin/technicians/[id] — approve or reject a technician */
export const PATCH = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const session = await getSession()
    if (!session) throw new AuthError()
    if (session.role !== "admin") throw new ForbiddenError()

    const { id } = await ctx.params

    const tech = await getTechnicianById(id)
    if (!tech) throw new NotFoundError("Técnico no encontrado")

    const body: unknown = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
    }

    const isApproved = parsed.data.action === "approve"
    await setTechnicianApproval(id, isApproved)

    logger.info(
      { adminUid: session.uid, technicianId: id, action: parsed.data.action },
      "Admin technician approval action",
    )

    return ok({ id, isApproved })
  }
)
