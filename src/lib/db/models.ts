/**
 * Firestore data access layer — scooterModels collection
 * Server-side only (uses Admin SDK)
 */
import { adminDb } from "@/lib/firebase-admin"
import type { ScooterModel } from "@/types"

const COLLECTION = "scooterModels"

function docToScooterModel(id: string, data: FirebaseFirestore.DocumentData): ScooterModel {
  return {
    id,
    brandId: data["brandId"] as string,
    name: data["name"] as string,
    slug: data["slug"] as string,
    imageURL: (data["imageURL"] as string | null) ?? null,
    specs: data["specs"] as ScooterModel["specs"],
    compatibleServices: (data["compatibleServices"] as string[]) ?? [],
    isActive: Boolean(data["isActive"]),
    createdAt:
      typeof data["createdAt"] === "string"
        ? data["createdAt"]
        : ((data["createdAt"] as FirebaseFirestore.Timestamp)?.toDate().toISOString() ?? ""),
  }
}

/** Get all active models (optionally filtered by brandId) */
export async function getActiveModels(brandId?: string): Promise<ScooterModel[]> {
  let query = adminDb.collection(COLLECTION).where("isActive", "==", true)
  if (brandId) {
    query = query.where("brandId", "==", brandId)
  }
  const snap = await query.orderBy("name").get()
  return snap.docs.map((doc) => docToScooterModel(doc.id, doc.data()))
}

/** Get a single model by slug */
export async function getModelBySlug(slug: string): Promise<ScooterModel | null> {
  const snap = await adminDb.collection(COLLECTION).where("slug", "==", slug).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  if (!doc) return null
  return docToScooterModel(doc.id, doc.data())
}

/** Get a single model by ID */
export async function getModelById(id: string): Promise<ScooterModel | null> {
  const doc = await adminDb.collection(COLLECTION).doc(id).get()
  if (!doc.exists) return null
  return docToScooterModel(doc.id, doc.data()!)
}

/** Get models compatible with a specific service */
export async function getModelsByService(serviceId: string): Promise<ScooterModel[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("isActive", "==", true)
    .where("compatibleServices", "array-contains", serviceId)
    .orderBy("name")
    .get()
  return snap.docs.map((doc) => docToScooterModel(doc.id, doc.data()))
}
