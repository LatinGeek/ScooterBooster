import { resolve } from "node:path"
import dotenv from "dotenv"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

dotenv.config({ path: resolve(process.cwd(), ".env.local") })

function getAdminDb() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    })
  }

  return getFirestore()
}

function nowIso() {
  return new Date().toISOString()
}

function buildSearchTokens(...values: Array<string | undefined | null>) {
  const tokens = new Set<string>()

  for (const value of values) {
    if (!value) continue
    const normalized = value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")

    for (const token of normalized.split(" ")) {
      if (token) tokens.add(token)
    }
  }

  return [...tokens]
}

export async function upsertPendingTechnicianFixture(input: {
  technicianId: string
  userId: string
  displayName: string
  email: string
  location?: string
}) {
  const db = getAdminDb()
  const timestamp = nowIso()
  const location = input.location ?? "Cordón, Montevideo"

  await db
    .collection("users")
    .doc(input.userId)
    .set(
      {
        displayName: input.displayName,
        email: input.email,
        photoURL: null,
        role: "technician",
        phone: "+59899119999",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true }
    )

  await db
    .collection("technicians")
    .doc(input.technicianId)
    .set({
      userId: input.userId,
      displayName: input.displayName,
      bio: "Solicitud E2E para validar aprobación administrativa.",
      photoURL: "",
      phone: "+59899119999",
      whatsappNumber: "+59899119999",
      location,
      services: ["maintenance", "firmware"],
      supportedBrands: ["brand-xiaomi"],
      availability: {
        monday: { start: "09:00", end: "18:00", isAvailable: true },
        tuesday: { start: "09:00", end: "18:00", isAvailable: true },
        wednesday: { start: "09:00", end: "18:00", isAvailable: true },
        thursday: { start: "09:00", end: "18:00", isAvailable: true },
        friday: { start: "09:00", end: "18:00", isAvailable: true },
        saturday: { start: "10:00", end: "14:00", isAvailable: true },
        sunday: { start: "00:00", end: "00:00", isAvailable: false },
      },
      pricing: {
        maintenance: { basePrice: 1100, currency: "UYU" },
        firmware: { basePrice: 1400, currency: "UYU" },
      },
      rating: 0,
      reviewCount: 0,
      isApproved: false,
      isActive: true,
      normalizedLocation: location.toLowerCase(),
      searchTokens: buildSearchTokens(input.displayName, location, "mantenimiento firmware xiaomi"),
      createdAt: timestamp,
      updatedAt: timestamp,
    })
}

export async function upsertUserFixture(input: {
  userId: string
  displayName: string
  email: string
  phone?: string | null
  role?: "user" | "technician" | "admin"
}) {
  const db = getAdminDb()
  const timestamp = nowIso()

  await db
    .collection("users")
    .doc(input.userId)
    .set(
      {
        displayName: input.displayName,
        email: input.email,
        photoURL: null,
        role: input.role ?? "user",
        phone: input.phone ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true }
    )
}

export async function createTechnicianBookingFixture(input: {
  bookingId: string
  userId: string
  technicianId: string
  serviceId?: string
  scooterModelId?: string
  scheduledDate: string
  status: "pending" | "confirmed" | "in_progress" | "completed"
  notes?: string
}) {
  const db = getAdminDb()
  const timestamp = nowIso()

  await db
    .collection("users")
    .doc(input.userId)
    .set(
      {
        displayName: "Cliente E2E",
        email: `${input.userId}@example.com`,
        photoURL: null,
        role: "user",
        phone: "+59899118888",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      { merge: true }
    )

  await db
    .collection("bookings")
    .doc(input.bookingId)
    .set({
      userId: input.userId,
      technicianId: input.technicianId,
      serviceId: input.serviceId ?? "maintenance",
      scooterModelId: input.scooterModelId ?? "xiaomi-1s",
      status: input.status,
      scheduledDate: input.scheduledDate,
      notes: input.notes ?? "Reserva sembrada por Playwright",
      basePrice: 1000,
      serviceFee: 120,
      totalPrice: 1120,
      paymentStatus: input.status === "pending" ? "pending" : "paid",
      paymentLinkId: null,
      paymentLinkUrl: null,
      disclaimerAccepted: false,
      disclaimerAcceptedAt: null,
      disclaimerVersion: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
}

export async function deleteFixture(collectionName: string, id: string) {
  const db = getAdminDb()
  await db.collection(collectionName).doc(id).delete()
}
