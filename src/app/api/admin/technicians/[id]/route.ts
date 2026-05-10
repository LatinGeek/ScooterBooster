import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { getBookingsByTechnician } from "@/lib/db/bookings"
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
import { adminDb } from "@/lib/firebase-admin"
import logger from "@/lib/logger"
import { sendTechnicianApprovedEmail, sendTechnicianRejectedEmail } from "@/lib/notification-emails"
import { sanitizeOptionalPlainText } from "@/lib/sanitize"
import { getSession } from "@/lib/session"
import { assertTrustedOrigin } from "@/lib/security"
import { safeRevalidateTag } from "@/lib/revalidate"
import type { Technician } from "@/types"

const dayAvailabilitySchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
  end: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM requerido"),
  isAvailable: z.boolean(),
})

const moderationSchema = z.object({
  action: z.enum(["approve", "reject", "request_changes"], { error: "Acción inválida" }),
  reason: z.string().max(500).optional(),
})

const deleteSchema = z.object({
  action: z.literal("delete"),
  hard: z.boolean().optional(),
})

const technicianModelPricingSchema = z.object({
  price: z.number().min(0),
  currency: z.literal("UYU"),
  isAvailable: z.boolean(),
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
  availability: z.record(z.string(), dayAvailabilitySchema).optional(),
  pricingMatrix: z.record(z.string(), z.record(z.string(), technicianModelPricingSchema)).optional(),
  pricing: z
    .record(
      z.string(),
      z.object({
        basePrice: z.number().min(0),
        currency: z.literal("UYU"),
      }),
    )
    .optional(),
  isActive: z.boolean().optional(),
})

const patchSchema = z.union([moderationSchema, overrideSchema, deleteSchema])
type TechnicianModerationResponse = {
  id: string
  isApproved: boolean
  applicationStatus: "approved" | "request_changes" | "rejected"
  moderationReason: string | null
}

type TechnicianDeleteResponse = {
  id: string
  deleted: true
  hard: boolean
}

export const PATCH = withErrorHandling<
  Technician | TechnicianModerationResponse | TechnicianDeleteResponse,
  [NextRequest, { params: Promise<{ id: string }> }]
>(
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
        availability: parsed.data.availability,
        pricingMatrix: parsed.data.pricingMatrix,
        pricing: parsed.data.pricing,
        isActive: parsed.data.isActive,
      })

      safeRevalidateTag("technicians")
      const auditResult = await Promise.allSettled([
        addAuditLogEntry({
          action: "technician_profile_overridden",
          actorUid: session.uid,
          targetType: "technician",
          targetId: id,
          metadata: {
            services: updated.services,
            supportedBrands: updated.supportedBrands,
            isActive: updated.isActive,
          },
        }),
      ])
      if (auditResult[0]?.status === "rejected") {
        logger.warn(
          {
            adminUid: session.uid,
            technicianId: id,
            err: auditResult[0].reason,
          },
          "Failed to write technician audit log",
        )
      }

      return ok(updated)
    }

    if (parsed.data.action === "delete") {
      const techRef = adminDb.collection("technicians").doc(id)
      const bookings = await getBookingsByTechnician(id)
      const activeBookings = bookings.filter((booking) =>
        ["pending", "confirmed", "in_progress"].includes(booking.status),
      )

      if (activeBookings.length > 0) {
        throw new ValidationError(
          `No se puede eliminar este técnico porque tiene ${activeBookings.length} reserva${activeBookings.length !== 1 ? "s" : ""} activa${activeBookings.length !== 1 ? "s" : ""}.`,
        )
      }

      const now = new Date().toISOString()
      if (parsed.data.hard) {
        if (bookings.length > 0) {
          throw new ValidationError("No se puede hacer un borrado total porque el técnico ya tiene reservas registradas.")
        }
        await adminAuth.deleteUser(tech.userId)
        await techRef.delete()
      } else {
        await techRef.update({
          deletedAt: now,
          isActive: false,
          isApproved: false,
          applicationStatus: "rejected",
          updatedAt: now,
        })
        await adminAuth.updateUser(tech.userId, { disabled: true })
      }

      safeRevalidateTag("technicians")
      await addAuditLogEntry({
        action: parsed.data.hard ? "technician_hard_deleted" : "technician_deleted",
        actorUid: session.uid,
        targetType: "technician",
        targetId: id,
        metadata: {
          userId: tech.userId,
          hard: Boolean(parsed.data.hard),
          totalBookings: bookings.length,
          activeBookings: activeBookings.length,
        },
      })

      return ok({ id, deleted: true, hard: Boolean(parsed.data.hard) })
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
    safeRevalidateTag("technicians")

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
