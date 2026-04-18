/**
 * Firestore data access layer — scooterBrands collection
 * Server-side only (uses Admin SDK)
 */
import { adminDb } from "@/lib/firebase-admin"
import type { ScooterBrand } from "@/types"

const COLLECTION = "scooterBrands"

function docToScooterBrand(id: string, data: FirebaseFirestore.DocumentData): ScooterBrand {
  return {
    id,
    name: data["name"] as string,
    slug: data["slug"] as string,
    logoURL: (data["logoURL"] as string | null) ?? null,
    isActive: Boolean(data["isActive"]),
    searchTokens: (data["searchTokens"] as string[]) ?? [],
    createdAt:
      typeof data["createdAt"] === "string"
        ? data["createdAt"]
        : ((data["createdAt"] as FirebaseFirestore.Timestamp)?.toDate().toISOString() ?? ""),
  }
}

/** Get all active brands */
export async function getActiveBrands(): Promise<ScooterBrand[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("isActive", "==", true)
    .orderBy("name")
    .get()
  return snap.docs.map((doc) => docToScooterBrand(doc.id, doc.data()))
}

/** Get a single brand by slug */
export async function getBrandBySlug(slug: string): Promise<ScooterBrand | null> {
  const snap = await adminDb.collection(COLLECTION).where("slug", "==", slug).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  if (!doc) return null
  return docToScooterBrand(doc.id, doc.data())
}

/** Get a single brand by ID */
export async function getBrandById(id: string): Promise<ScooterBrand | null> {
  const doc = await adminDb.collection(COLLECTION).doc(id).get()
  if (!doc.exists) return null
  return docToScooterBrand(doc.id, doc.data()!)
}
