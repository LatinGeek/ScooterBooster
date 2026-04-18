/**
 * Firestore data access layer — technicians collection
 * Server-side only (uses Admin SDK)
 */
import { adminDb } from "@/lib/firebase-admin"
import type { Technician } from "@/types"

const COLLECTION = "technicians"

function docToTechnician(id: string, data: FirebaseFirestore.DocumentData): Technician {
  return {
    id,
    userId: data["userId"] as string,
    displayName: data["displayName"] as string,
    bio: data["bio"] as string,
    photoURL: data["photoURL"] as string,
    phone: data["phone"] as string,
    whatsappNumber: data["whatsappNumber"] as string,
    location: data["location"] as string,
    services: (data["services"] as string[]) ?? [],
    supportedBrands: (data["supportedBrands"] as string[]) ?? [],
    availability: (data["availability"] as Technician["availability"]) ?? {},
    pricing: (data["pricing"] as Technician["pricing"]) ?? {},
    rating: (data["rating"] as number) ?? 0,
    reviewCount: (data["reviewCount"] as number) ?? 0,
    isApproved: Boolean(data["isApproved"]),
    isActive: Boolean(data["isActive"]),
    createdAt:
      typeof data["createdAt"] === "string"
        ? data["createdAt"]
        : ((data["createdAt"] as FirebaseFirestore.Timestamp)?.toDate().toISOString() ?? ""),
    updatedAt:
      typeof data["updatedAt"] === "string"
        ? data["updatedAt"]
        : ((data["updatedAt"] as FirebaseFirestore.Timestamp)?.toDate().toISOString() ?? ""),
  }
}

export interface GetTechniciansOptions {
  serviceId?: string
  brandId?: string
  limit?: number
  sortBy?: "rating" | "reviewCount"
}

/** Get all approved + active technicians with optional filters */
export async function getActiveTechnicians(
  opts: GetTechniciansOptions = {}
): Promise<Technician[]> {
  let query = adminDb
    .collection(COLLECTION)
    .where("isApproved", "==", true)
    .where("isActive", "==", true)

  if (opts.serviceId) {
    query = query.where("services", "array-contains", opts.serviceId)
  }
  if (opts.brandId) {
    query = query.where("supportedBrands", "array-contains", opts.brandId)
  }

  const sortField = opts.sortBy ?? "rating"
  query = query.orderBy(sortField, "desc")

  if (opts.limit) {
    query = query.limit(opts.limit)
  }

  const snap = await query.get()
  return snap.docs.map((doc) => docToTechnician(doc.id, doc.data()))
}

/** Get a single technician by ID */
export async function getTechnicianById(id: string): Promise<Technician | null> {
  const doc = await adminDb.collection(COLLECTION).doc(id).get()
  if (!doc.exists) return null
  return docToTechnician(doc.id, doc.data()!)
}

/** Get a technician profile by userId (Firebase Auth UID) */
export async function getTechnicianByUserId(userId: string): Promise<Technician | null> {
  const snap = await adminDb.collection(COLLECTION).where("userId", "==", userId).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  if (!doc) return null
  return docToTechnician(doc.id, doc.data())
}

/** Get all technicians (for admin panel) */
export async function getAllTechnicians(): Promise<Technician[]> {
  const snap = await adminDb.collection(COLLECTION).orderBy("createdAt", "desc").get()
  return snap.docs.map((doc) => docToTechnician(doc.id, doc.data()))
}

/** Update technician approval status */
export async function setTechnicianApproval(id: string, isApproved: boolean): Promise<void> {
  await adminDb.collection(COLLECTION).doc(id).update({
    isApproved,
    updatedAt: new Date().toISOString(),
  })
}

export interface UpdateTechnicianInput {
  displayName?: string
  bio?: string
  phone?: string
  whatsappNumber?: string
  location?: string
  services?: string[]
  supportedBrands?: string[]
  availability?: Technician["availability"]
  pricing?: Technician["pricing"]
  isActive?: boolean
}

/** Update a technician's own profile fields */
export async function updateTechnicianProfile(
  id: string,
  input: UpdateTechnicianInput
): Promise<Technician> {
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  const fields = [
    "displayName",
    "bio",
    "phone",
    "whatsappNumber",
    "location",
    "services",
    "supportedBrands",
    "availability",
    "pricing",
    "isActive",
  ] as const
  for (const f of fields) {
    if (input[f] !== undefined) updates[f] = input[f]
  }
  await adminDb.collection(COLLECTION).doc(id).update(updates)
  const doc = await adminDb.collection(COLLECTION).doc(id).get()
  return docToTechnician(doc.id, doc.data()!)
}
