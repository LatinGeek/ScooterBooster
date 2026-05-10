/**
 * Firestore data access layer — scooterBrands collection
 * Server-side only (uses Admin SDK)
 */
import { unstable_cache as nextCache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { slugify } from "@/lib/slugs"
import type { ScooterBrand } from "@/types"

const COLLECTION = "scooterBrands"
const BRAND_LOGO_FALLBACKS: Record<string, string> = {
  atom: "/assets/brand-logos/atom.jpg",
  joyor: "/assets/brand-logos/joyor.jpg",
  "mi-style": "/assets/brand-logos/mistyle.png",
  mistyle: "/assets/brand-logos/mistyle.png",
  navee: "/assets/brand-logos/navee.png",
  xiaomi: "/assets/brand-logos/xiaomi.png",
}

function resolveBrandLogo(
  name: string,
  slug: string,
  logoURL: string | null | undefined,
): string | null {
  if (logoURL) return logoURL

  const slugKey = slugify(slug)
  const nameKey = slugify(name)
  return BRAND_LOGO_FALLBACKS[slugKey] ?? BRAND_LOGO_FALLBACKS[nameKey] ?? null
}

function docToScooterBrand(id: string, data: FirebaseFirestore.DocumentData): ScooterBrand {
  const name = data["name"] as string
  const slug = data["slug"] as string
  const logoURL = (data["logoURL"] as string | null) ?? null

  return {
    id,
    name,
    slug,
    logoURL: resolveBrandLogo(name, slug, logoURL),
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

export async function deleteBrand(id: string): Promise<void> {
  const brandRef = adminDb.collection(COLLECTION).doc(id)
  const modelsSnap = await adminDb.collection("scooterModels").where("brandId", "==", id).get()
  const batch = adminDb.batch()

  for (const modelDoc of modelsSnap.docs) {
    batch.delete(modelDoc.ref)
  }

  batch.delete(brandRef)
  await batch.commit()
}
