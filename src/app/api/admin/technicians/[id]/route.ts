import { NextRequest } from "next/server"
import { z } from "zod"
import { revalidateTag } from "next/cache"
import { ok, withErrorHandling } from "@/lib/api-response"
import { adminAuth } from "@/lib/firebase-admin"
import { getSession } from "@/lib/session"
import { getTechnicianById, setTechnicianApproval } from "@/lib/db/technicians"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import logger from "@/lib/logger"
import { assertTrustedOrigin } from "@/lib/security"

const patchSchema = z.object({
  action: z.enum(["approve", "reject"], { error: "Acción inválida" }),
  reason: z.string().max(500).optional(),
})

/** PATCH /api/admin/technicians/[id] — approve or reject a technician */
export const PATCH = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    assertTrustedOrigin(req)

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
    await adminAuth.setCustomUserClaims(tech.userId, { role: isApproved ? "technician" : "user" })

    // Bust cached technician lists so the listing pages reflect the new approval state
    // Next.js 16 revalidateTag requires a second profile argument; expire: 0 = immediate
    revalidateTag("technicians", { expire: 0 })

    logger.info(
      { adminUid: session.uid, technicianId: id, action: parsed.data.action },
      "Admin technician approval action",
    )

    return ok({ id, isApproved })
  }
)
