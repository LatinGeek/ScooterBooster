import { NextRequest } from "next/server"
import { z } from "zod"
import { ok, withErrorHandling } from "@/lib/api-response"
import { adminDb } from "@/lib/firebase-admin"
import { getSession } from "@/lib/session"
import { createTechnicianApplication, getTechnicianByUserId } from "@/lib/db/technicians"
import { AuthError, ForbiddenError, ValidationError } from "@/lib/errors"
import { sanitizePlainText } from "@/lib/sanitize"
import { assertTrustedOrigin } from "@/lib/security"

const applySchema = z.object({
  bio: z.string().min(40, "Contanos un poco mas sobre tu experiencia").max(500),
  services: z.array(z.string().min(1)).min(1, "Elegi al menos un servicio"),
  supportedBrands: z.array(z.string().min(1)).min(1, "Elegi al menos una marca"),
  location: z.string().min(3, "Indicá tu zona de trabajo").max(100),
  whatsappNumber: z
    .string()
    .regex(/^598\d{8}$/, "WhatsApp debe tener formato 598XXXXXXXX (sin +)"),
  basePrice: z.coerce
    .number()
    .int("El precio base debe ser un numero entero")
    .min(500, "El precio base debe ser al menos $500")
    .max(20000, "El precio base no puede superar $20.000"),
})

function createDefaultAvailability() {
  return {
    monday: { start: "09:00", end: "18:00", isAvailable: true },
    tuesday: { start: "09:00", end: "18:00", isAvailable: true },
    wednesday: { start: "09:00", end: "18:00", isAvailable: true },
    thursday: { start: "09:00", end: "18:00", isAvailable: true },
    friday: { start: "09:00", end: "18:00", isAvailable: true },
    saturday: { start: "10:00", end: "14:00", isAvailable: true },
    sunday: { start: "00:00", end: "00:00", isAvailable: false },
  }
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  assertTrustedOrigin(req)

  const session = await getSession()
  if (!session) throw new AuthError()
  if (session.role && session.role !== "user") {
    throw new ForbiddenError("Solo usuarios pueden postularse como tecnicos")
  }

  const existingTechnician = await getTechnicianByUserId(session.uid)
  if (existingTechnician) {
    throw new ValidationError("Ya existe una solicitud o perfil tecnico para esta cuenta")
  }

  const body = (await req.json()) as Record<string, unknown>
  const parsed = applySchema.safeParse({
    ...body,
    bio: typeof body.bio === "string" ? sanitizePlainText(body.bio) : body.bio,
    location: typeof body.location === "string" ? sanitizePlainText(body.location) : body.location,
  })

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? "Datos invalidos")
  }

  const userSnap = await adminDb.collection("users").doc(session.uid).get()
  if (!userSnap.exists) {
    throw new ValidationError("Primero necesitamos que completes tu perfil de usuario")
  }

  const userData = userSnap.data() as {
    displayName?: string
    phone?: string | null
    photoURL?: string | null
  }

  if (!userData.displayName || userData.displayName.trim().length < 2) {
    throw new ValidationError("Completa tu nombre en tu perfil antes de postularte")
  }

  if (!userData.phone) {
    throw new ValidationError("Completa tu telefono en onboarding antes de postularte")
  }

  const pricing = Object.fromEntries(
    parsed.data.services.map((serviceId) => [
      serviceId,
      { basePrice: parsed.data.basePrice, currency: "UYU" as const },
    ])
  )

  const technician = await createTechnicianApplication({
    id: session.uid,
    userId: session.uid,
    displayName: userData.displayName.trim(),
    bio: parsed.data.bio,
    photoURL: userData.photoURL ?? "",
    phone: userData.phone,
    whatsappNumber: parsed.data.whatsappNumber,
    location: parsed.data.location,
    services: parsed.data.services,
    supportedBrands: parsed.data.supportedBrands,
    pricing,
    availability: createDefaultAvailability(),
  })

  await adminDb.collection("auditLog").add({
    type: "technician_application_submitted",
    actorUid: session.uid,
    technicianId: technician.id,
    createdAt: new Date().toISOString(),
    metadata: {
      services: technician.services,
      supportedBrands: technician.supportedBrands,
      location: technician.location,
    },
  })

  return ok(
    {
      id: technician.id,
      isApproved: technician.isApproved,
      isActive: technician.isActive,
    },
    201
  )
})
