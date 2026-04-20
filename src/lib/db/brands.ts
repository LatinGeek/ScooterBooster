/**
 * Firestore data access layer — scooterBrands collection
 * Server-side only (uses Admin SDK)
 */
import { unstable_cache as nextCache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { slugify } from "@/lib/slugs"
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

/** Get all active brands — cached for 5 min, revalidated by 'brands' tag */
export const getActiveBrands = nextCache(
  async (): Promise<ScooterBrand[]> => {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("isActive", "==", true)
      .orderBy("name")
      .get()
    return snap.docs.map((doc) => docToScooterBrand(doc.id, doc.data()))
  },
  ["brands-active"],
  { tags: ["brands"], revalidate: 300 },
)

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

export async function getAllBrands(): Promise<ScooterBrand[]> {
  const snap = await adminDb.collection(COLLECTION).orderBy("name").get()
  return snap.docs.map((doc) => docToScooterBrand(doc.id, doc.data()))
}

export async function createBrand(input: {
  name: string
  logoURL?: string | null
  isActive: boolean
}): Promise<ScooterBrand> {
  const createdAt = new Date().toISOString()
  const ref = adminDb.collection(COLLECTION).doc()
  const data = {
    name: input.name,
    slug: slugify(input.name),
    logoURL: input.logoURL ?? null,
    isActive: input.isActive,
    searchTokens: slugify(input.name).split("-"),
    createdAt,
    updatedAt: createdAt,
  }

  await ref.set(data)
  return docToScooterBrand(ref.id, data)
}

export async function updateBrand(
  id: string,
  input: {
    name?: string
    logoURL?: string | null
    isActive?: boolean
  },
): Promise<ScooterBrand> {
  const current = await getBrandById(id)
  if (!current) throw new Error("BRAND_NOT_FOUND")

  const name = input.name ?? current.name
  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
    slug: slugify(name),
    searchTokens: slugify(name).split("-"),
  }

  if (input.name !== undefined) updates["name"] = input.name
  if (input.logoURL !== undefined) updates["logoURL"] = input.logoURL
  if (input.isActive !== undefined) updates["isActive"] = input.isActive

  await adminDb.collection(COLLECTION).doc(id).update(updates)
  const updated = await adminDb.collection(COLLECTION).doc(id).get()
  return docToScooterBrand(updated.id, updated.data()!)
}
