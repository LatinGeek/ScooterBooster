import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getSession } from "@/lib/session"
import { setTechnicianReply, getReviewsByTechnician } from "@/lib/db/reviews"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { adminDb } from "@/lib/firebase-admin"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"

const replySchema = z.object({
  technicianReply: z.string().min(1).max(300),
})

/** PATCH /api/reviews/[id] — technician adds/updates reply */
export const PATCH = withErrorHandling(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    const session = await getSession()
    if (!session) throw new AuthError()
    if (session.role !== "technician" && session.role !== "admin") throw new ForbiddenError()

    const { id } = await ctx.params

    const reviewSnap = await adminDb.collection("reviews").doc(id).get()
    if (!reviewSnap.exists) throw new NotFoundError("Reseña no encontrada")

    const reviewData = reviewSnap.data()!

    // Verify this review belongs to the authenticated technician
    const tech = await getTechnicianByUserId(session.uid)
    if (!tech) throw new NotFoundError("Perfil de técnico no encontrado")
    if (reviewData["technicianId"] !== tech.id && session.role !== "admin") {
      throw new ForbiddenError()
    }

    const body: unknown = await req.json()
    const parsed = replySchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
    }

    await setTechnicianReply(id, parsed.data.technicianReply)

    // Return updated list for the technician
    const reviews = await getReviewsByTechnician(tech.id)
    return ok(reviews)
  }
)
