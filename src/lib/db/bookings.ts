/**
 * Firestore data access layer — bookings collection
 * Server-side only (uses Admin SDK)
 */
import { adminDb } from "@/lib/firebase-admin"
import type { Booking } from "@/types"

const COLLECTION = "bookings"

function docToBooking(id: string, data: FirebaseFirestore.DocumentData): Booking {
  const toIso = (v: unknown): string => {
    if (typeof v === "string") return v
    if (v && typeof (v as FirebaseFirestore.Timestamp).toDate === "function") {
      return (v as FirebaseFirestore.Timestamp).toDate().toISOString()
    }
    return ""
  }

  return {
    id,
    userId: data["userId"] as string,
    technicianId: data["technicianId"] as string,
    serviceId: data["serviceId"] as string,
    scooterModelId: data["scooterModelId"] as string,
    status: data["status"] as Booking["status"],
    scheduledDate: toIso(data["scheduledDate"]),
    notes: (data["notes"] as string | null) ?? null,
    basePrice: data["basePrice"] as number,
    serviceFee: data["serviceFee"] as number,
    totalPrice: data["totalPrice"] as number,
    paymentStatus: data["paymentStatus"] as Booking["paymentStatus"],
    paymentLinkId: (data["paymentLinkId"] as string | null) ?? null,
    paymentLinkUrl: (data["paymentLinkUrl"] as string | null) ?? null,
    disclaimerAccepted: Boolean(data["disclaimerAccepted"]),
    disclaimerAcceptedAt: data["disclaimerAcceptedAt"] ? toIso(data["disclaimerAcceptedAt"]) : null,
    disclaimerVersion: (data["disclaimerVersion"] as string | null) ?? null,
    createdAt: toIso(data["createdAt"]),
    updatedAt: toIso(data["updatedAt"]),
  }
}

/** Get all bookings for a user */
export async function getBookingsByUser(userId: string): Promise<Booking[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get()
  return snap.docs.map((doc) => docToBooking(doc.id, doc.data()))
}

/** Get all bookings for a technician */
export async function getBookingsByTechnician(technicianId: string): Promise<Booking[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("technicianId", "==", technicianId)
    .orderBy("createdAt", "desc")
    .get()
  return snap.docs.map((doc) => docToBooking(doc.id, doc.data()))
}

/** Get a single booking by ID */
export async function getBookingById(id: string): Promise<Booking | null> {
  const doc = await adminDb.collection(COLLECTION).doc(id).get()
  if (!doc.exists) return null
  return docToBooking(doc.id, doc.data()!)
}

export interface CreateBookingInput {
  userId: string
  technicianId: string
  serviceId: string
  scooterModelId: string
  scheduledDate: string
  notes?: string | null
  basePrice: number
  serviceFee: number
  totalPrice: number
  disclaimerAccepted: boolean
  disclaimerAcceptedAt?: string | null
  disclaimerVersion?: string | null
}

/** Create a new booking (uses Firestore transaction for double-booking prevention) */
export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const now = new Date().toISOString()
  const docRef = adminDb.collection(COLLECTION).doc()

  const data: Omit<Booking, "id"> = {
    userId: input.userId,
    technicianId: input.technicianId,
    serviceId: input.serviceId,
    scooterModelId: input.scooterModelId,
    status: "pending" as const,
    scheduledDate: input.scheduledDate,
    notes: input.notes ?? null,
    basePrice: input.basePrice,
    serviceFee: input.serviceFee,
    totalPrice: input.totalPrice,
    paymentStatus: "pending",
    paymentLinkId: null,
    paymentLinkUrl: null,
    disclaimerAccepted: input.disclaimerAccepted,
    disclaimerAcceptedAt: input.disclaimerAcceptedAt ?? null,
    disclaimerVersion: input.disclaimerVersion ?? null,
    createdAt: now,
    updatedAt: now,
  }

  await adminDb.runTransaction(async (tx) => {
    const conflictSnap = await tx.get(
      adminDb
        .collection(COLLECTION)
        .where("technicianId", "==", input.technicianId)
        .where("scheduledDate", "==", input.scheduledDate)
        .where("status", "in", ["pending", "confirmed", "in_progress"]),
    )
    if (!conflictSnap.empty) {
      throw new Error("SLOT_TAKEN")
    }
    tx.set(docRef, data)
  })

  return { id: docRef.id, ...data }
}

/** Update booking status */
export async function updateBookingStatus(id: string, status: Booking["status"]): Promise<void> {
  await adminDb.collection(COLLECTION).doc(id).update({
    status,
    updatedAt: new Date().toISOString(),
  })
}

/** Store MercadoPago preference ID and payment link URL on the booking */
export async function updateBookingPaymentLink(
  id: string,
  preferenceId: string,
  paymentLinkUrl: string,
): Promise<void> {
  await adminDb.collection(COLLECTION).doc(id).update({
    paymentLinkId: preferenceId,
    paymentLinkUrl,
    updatedAt: new Date().toISOString(),
  })
}

/** Update booking payment status (called by webhook after MP confirmation) */
export async function updateBookingPaymentStatus(
  id: string,
  paymentStatus: Booking["paymentStatus"],
  bookingStatus?: Booking["status"],
): Promise<void> {
  const update: Record<string, unknown> = {
    paymentStatus,
    updatedAt: new Date().toISOString(),
  }
  if (bookingStatus) {
    update["status"] = bookingStatus
  }
  await adminDb.collection(COLLECTION).doc(id).update(update)
}

/** Get a booking by external reference (MP external_reference = "booking_{id}") */
export async function getBookingByExternalReference(
  externalReference: string,
): Promise<Booking | null> {
  const bookingId = externalReference.replace("booking_", "")
  return getBookingById(bookingId)
}
