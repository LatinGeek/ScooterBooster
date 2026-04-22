import { NextRequest } from "next/server"
import { revalidateTag } from "next/cache"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getServiceById } from "@/lib/db/services"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import {
  getTechnicianById,
  setTechnicianApplicationStatus,
  setTechnicianApproval,
  updateTechnicianProfile,
} from "@/lib/db/technicians"
import { getUserById } from "@/lib/db/users"
import { AuthError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors"
import { adminAuth } from "@/lib/firebase-admin"
import logger from "@/lib/logger"
import { sendTechnicianApprovedEmail, sendTechnicianRejectedEmail } from "@/lib/notification-emails"
import { sanitizeOptionalPlainText } from "@/lib/sanitize"
import { getSession } from "@/lib/session"
import { assertTrustedOrigin } from "@/lib/security"
import type { Technician } from "@/types"

const moderationSchema = z.object({
  action: z.enum(["approve", "reject", "request_changes"], { error: "Acción inválida" }),
  reason: z.string().max(500).optional(),
})

const overrideSchema = z.object({
  action: z.literal("update"),
  displayName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  photoURL: z.union([z.string().url("La foto debe ser una URL válida"), z.literal("")]).optional(),
  phone: z.string().regex(/^\+598\d{8}$/, "El teléfono debe tener formato +598XXXXXXXX").optional(),
  whatsappNumber: z.string().regex(/^598\d{8}$/, "WhatsApp debe tener formato 598XXXXXXXX (sin +)").optional(),
  location: z.string().max(100).optional(),
  services: z.array(z.string()).optional(),
  supportedBrands: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

const patchSchema = z.union([moderationSchema, overrideSchema])
type TechnicianModerationResponse = {
  id: string
  isApproved: boolean
  applicationStatus: "approved" | "request_changes" | "rejected"
  moderationReason: string | null
}

export const PATCH = withErrorHandling<Technician | TechnicianModerationResponse, [NextRequest, { params: Promise<{ id: string }> }]>(
  async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
    assertTrustedOrigin(req)

    const session = await getSession()
    if (!session) throw new AuthError()
    if (session.role !== "admin") throw new ForbiddenError()

    const { id } = await ctx.params
    const tech = await getTechnicianById(id)
    if (!tech) throw new NotFoundError("Técnico no encontrado")

    const rawBody = (await req.json()) as Record<string, unknown>
    if (!["approve", "reject", "request_changes", "update"].includes(String(rawBody.action ?? ""))) {
      throw new ValidationError("Acción inválida")
    }
    const parsed = patchSchema.safeParse({
      ...rawBody,
      bio: typeof rawBody.bio === "string" ? sanitizeOptionalPlainText(rawBody.bio) : rawBody.bio,
    })
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
    }

    if (parsed.data.action === "update") {
      const updated = await updateTechnicianProfile(id, {
        displayName: parsed.data.displayName,
        bio: parsed.data.bio,
        photoURL: parsed.data.photoURL,
        phone: parsed.data.phone,
        whatsappNumber: parsed.data.whatsappNumber,
        location: parsed.data.location,
        services: parsed.data.services,
        supportedBrands: parsed.data.supportedBrands,
        isActive: parsed.data.isActive,
      })

      revalidateTag("technicians", { expire: 0 })
      await addAuditLogEntry({
        action: "technician_profile_overridden",
        actorUid: session.uid,
        targetType: "technician",
        targetId: id,
        metadata: {
          services: updated.services,
          supportedBrands: updated.supportedBrands,
          isActive: updated.isActive,
        },
      })

      return ok(updated)
    }

    const isApproved = parsed.data.action === "approve"
    const rejectionReason = parsed.data.reason?.trim() || "Necesitamos revisar algunos datos antes de aprobar tu perfil."

    if (parsed.data.action === "request_changes") {
      await setTechnicianApplicationStatus(id, {
        status: "request_changes",
        reason: rejectionReason,
      })
      await adminAuth.setCustomUserClaims(tech.userId, { role: "user" })
    } else {
      await setTechnicianApproval(id, isApproved)
      await adminAuth.setCustomUserClaims(tech.userId, { role: isApproved ? "technician" : "user" })
    }
    revalidateTag("technicians", { expire: 0 })

    logger.info(
      { adminUid: session.uid, technicianId: id, action: parsed.data.action },
          "Admin technician moderation action",
    )

    const [user, serviceNames] = await Promise.all([
      getUserById(tech.userId),
      Promise.all(tech.services.map(async (serviceId) => (await getServiceById(serviceId))?.name ?? serviceId)),
    ])

    await Promise.allSettled([
      addAuditLogEntry({
        action:
          parsed.data.action === "request_changes"
            ? "technician_changes_requested"
            : isApproved
              ? "technician_approved"
              : "technician_rejected",
        actorUid: session.uid,
        targetType: "technician",
        targetId: id,
        metadata: {
          userId: tech.userId,
          reason: isApproved ? null : rejectionReason,
          services: serviceNames,
        },
      }),
      ...(user?.email
        ? isApproved
          ? [
              sendTechnicianApprovedEmail({
                to: user.email,
                technicianName: tech.displayName,
              }),
            ]
          : [
              sendTechnicianRejectedEmail({
                to: user.email,
                technicianName: tech.displayName,
                reason: rejectionReason,
              }),
            ]
        : []),
    ])

    return ok({
      id,
      isApproved,
      applicationStatus: parsed.data.action === "request_changes" ? "request_changes" : isApproved ? "approved" : "rejected",
      moderationReason: isApproved ? null : rejectionReason,
    })
  },
)
