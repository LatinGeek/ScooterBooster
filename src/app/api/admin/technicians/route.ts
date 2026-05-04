import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { addAuditLogEntry } from "@/lib/db/audit-log"
import { getAllTechnicians, createTechnicianApplication } from "@/lib/db/technicians"
import { adminAuth } from "@/lib/firebase-admin"
import { AuthError, ConflictError, ForbiddenError, ValidationError } from "@/lib/errors"
import { getSession } from "@/lib/session"
import { assertTrustedOrigin } from "@/lib/security"
import { safeRevalidateTag } from "@/lib/revalidate"
import type { TechnicianModelPricing } from "@/types"

const technicianModelPricingSchema = z.object({
  price: z.number().min(0),
  currency: z.literal("UYU"),
  isAvailable: z.boolean(),
})

const createTechnicianSchema = z.object({
  email: z.string().email("Email inválido"),
  displayName: z.string().min(2).max(100),
  bio: z.string().min(40).max(500),
  phone: z.string().regex(/^\+598\d{8}$/, "El teléfono debe tener formato +598XXXXXXXX"),
  whatsappNumber: z.string().regex(/^598\d{8}$/, "WhatsApp debe tener formato 598XXXXXXXX (sin +)"),
  location: z.string().min(2).max(100),
  photoURL: z.union([z.string().url("La foto debe ser una URL válida"), z.literal("")]).optional(),
  pricingMatrix: z.record(z.string(), z.record(z.string(), technicianModelPricingSchema)).optional(),
})

export const GET = withErrorHandling(async (req: NextRequest) => {
  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const technicians = await getAllTechnicians()
  const { searchParams } = req.nextUrl
  const status = searchParams.get("status") ?? "all"
  const search = (searchParams.get("search") ?? "").trim().toLowerCase()

  const filtered = technicians.filter((technician) => {
    if (status !== "all") {
      if (status === "pending" && technician.applicationStatus !== "pending") return false
      if (status === "approved" && !technician.isApproved) return false
      if (status === "rejected" && !["request_changes", "rejected"].includes(technician.applicationStatus ?? "")) return false
    }

    if (search) {
      const haystack = [
        technician.displayName,
        technician.bio,
        technician.location,
        technician.phone,
        technician.whatsappNumber,
      ]
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(search)) return false
    }

    return true
  })

  return NextResponse.json({ success: true, data: filtered, total: filtered.length })
})

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role !== "admin") throw new ForbiddenError()

  const body = (await req.json()) as Record<string, unknown>
  const parsed = createTechnicianSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos inválidos")
  }

  const email = parsed.data.email.trim().toLowerCase()
  const existingUser = await adminAuth
    .getUserByEmail(email)
    .catch(() => null)
  if (existingUser) {
    throw new ConflictError("Ya existe un usuario con ese email")
  }

  const user = await adminAuth.createUser({
    email,
    displayName: parsed.data.displayName,
    photoURL: parsed.data.photoURL?.trim() || undefined,
  })

  await adminAuth.setCustomUserClaims(user.uid, { role: "technician" })

  const technician = await createTechnicianApplication({
    id: user.uid,
    userId: user.uid,
    displayName: parsed.data.displayName,
    bio: parsed.data.bio,
    photoURL: parsed.data.photoURL?.trim() || "",
    phone: parsed.data.phone,
    whatsappNumber: parsed.data.whatsappNumber,
    location: parsed.data.location,
    services: [],
    supportedBrands: [],
    pricing: {},
    availability: {},
    pricingMatrix: (parsed.data.pricingMatrix ?? {}) as Record<string, Record<string, TechnicianModelPricing>>,
  })

  safeRevalidateTag("technicians")

  await addAuditLogEntry({
    action: "technician_created",
    actorUid: session.uid,
    targetType: "technician",
    targetId: technician.id,
    metadata: {
      userId: user.uid,
      email,
      isApproved: technician.isApproved,
      applicationStatus: technician.applicationStatus,
    },
  })

  return ok({ technicianId: technician.id, userId: user.uid }, 201)
})
