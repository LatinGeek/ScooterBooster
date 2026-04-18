/**
 * Firestore data access layer — services collection
 * Server-side only (uses Admin SDK)
 */
import { adminDb } from "@/lib/firebase-admin"
import type { Service } from "@/types"

const COLLECTION = "services"

function docToService(id: string, data: FirebaseFirestore.DocumentData): Service {
  return {
    id,
    name: data["name"] as string,
    slug: data["slug"] as string,
    description: data["description"] as string,
    category: data["category"] as Service["category"],
    estimatedDuration: data["estimatedDuration"] as number,
    requiresDisclaimer: Boolean(data["requiresDisclaimer"]),
    isActive: Boolean(data["isActive"]),
    createdAt:
      typeof data["createdAt"] === "string"
        ? data["createdAt"]
        : ((data["createdAt"] as FirebaseFirestore.Timestamp)?.toDate().toISOString() ?? ""),
  }
}

/** Get all active services */
export async function getActiveServices(): Promise<Service[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("isActive", "==", true)
    .orderBy("name")
    .get()
  return snap.docs.map((doc) => docToService(doc.id, doc.data()))
}

/** Get a single service by slug */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const snap = await adminDb.collection(COLLECTION).where("slug", "==", slug).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  if (!doc) return null
  return docToService(doc.id, doc.data())
}

/** Get a single service by ID */
export async function getServiceById(id: string): Promise<Service | null> {
  const doc = await adminDb.collection(COLLECTION).doc(id).get()
  if (!doc.exists) return null
  return docToService(doc.id, doc.data()!)
}

/** Get multiple services by ID array */
export async function getServicesByIds(ids: string[]): Promise<Service[]> {
  if (ids.length === 0) return []
  const chunks: string[][] = []
  for (let i = 0; i < ids.length; i += 10) {
    chunks.push(ids.slice(i, i + 10))
  }
  const results = await Promise.all(
    chunks.map((chunk) => adminDb.collection(COLLECTION).where("__name__", "in", chunk).get())
  )
  return results.flatMap((snap) => snap.docs.map((doc) => docToService(doc.id, doc.data())))
}
