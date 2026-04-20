/**
 * Firestore data access layer — scooterModels collection
 * Server-side only (uses Admin SDK)
 */
import { adminDb } from "@/lib/firebase-admin"
import { slugify } from "@/lib/slugs"
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
    searchTokens: (data["searchTokens"] as string[]) ?? [],
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

export async function getAllModels(): Promise<ScooterModel[]> {
  const snap = await adminDb.collection(COLLECTION).orderBy("name").get()
  return snap.docs.map((doc) => docToScooterModel(doc.id, doc.data()))
}

function buildModelSearchTokens(name: string, brandId: string) {
  return Array.from(new Set([...slugify(name).split("-"), ...slugify(brandId).split("-")])).filter(Boolean)
}

export async function createModel(input: {
  brandId: string
  name: string
  imageURL?: string | null
  specs: ScooterModel["specs"]
  compatibleServices: string[]
  isActive: boolean
}): Promise<ScooterModel> {
  const createdAt = new Date().toISOString()
  const ref = adminDb.collection(COLLECTION).doc()
  const data = {
    brandId: input.brandId,
    name: input.name,
    slug: slugify(input.name),
    imageURL: input.imageURL ?? null,
    specs: input.specs,
    compatibleServices: input.compatibleServices,
    isActive: input.isActive,
    searchTokens: buildModelSearchTokens(input.name, input.brandId),
    createdAt,
    updatedAt: createdAt,
  }

  await ref.set(data)
  return docToScooterModel(ref.id, data)
}

export async function updateModel(
  id: string,
  input: {
    brandId?: string
    name?: string
    imageURL?: string | null
    specs?: ScooterModel["specs"]
    compatibleServices?: string[]
    isActive?: boolean
  },
): Promise<ScooterModel> {
  const current = await getModelById(id)
  if (!current) throw new Error("MODEL_NOT_FOUND")

  const name = input.name ?? current.name
  const brandId = input.brandId ?? current.brandId
  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
    slug: slugify(name),
    searchTokens: buildModelSearchTokens(name, brandId),
  }

  if (input.brandId !== undefined) updates["brandId"] = input.brandId
  if (input.name !== undefined) updates["name"] = input.name
  if (input.imageURL !== undefined) updates["imageURL"] = input.imageURL
  if (input.specs !== undefined) updates["specs"] = input.specs
  if (input.compatibleServices !== undefined) updates["compatibleServices"] = input.compatibleServices
  if (input.isActive !== undefined) updates["isActive"] = input.isActive

  await adminDb.collection(COLLECTION).doc(id).update(updates)
  const updated = await adminDb.collection(COLLECTION).doc(id).get()
  return docToScooterModel(updated.id, updated.data()!)
}
