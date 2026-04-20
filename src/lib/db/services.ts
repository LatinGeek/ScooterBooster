/**
 * Firestore data access layer — services collection
 * Server-side only (uses Admin SDK)
 */
import { unstable_cache as nextCache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { slugify } from "@/lib/slugs"
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
    searchTokens: (data["searchTokens"] as string[]) ?? [],
    createdAt:
      typeof data["createdAt"] === "string"
        ? data["createdAt"]
        : ((data["createdAt"] as FirebaseFirestore.Timestamp)?.toDate().toISOString() ?? ""),
  }
}

/** Get all active services — cached for 5 min, revalidated by 'services' tag */
export const getActiveServices = nextCache(
  async (): Promise<Service[]> => {
    const snap = await adminDb
      .collection(COLLECTION)
      .where("isActive", "==", true)
      .orderBy("name")
      .get()
    return snap.docs.map((doc) => docToService(doc.id, doc.data()))
  },
  ["services-active"],
  { tags: ["services"], revalidate: 300 },
)

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

export async function getAllServices(): Promise<Service[]> {
  const snap = await adminDb.collection(COLLECTION).orderBy("name").get()
  return snap.docs.map((doc) => docToService(doc.id, doc.data()))
}

function buildServiceSearchTokens(name: string, description: string, category: string) {
  return Array.from(
    new Set(`${slugify(name)} ${slugify(description)} ${slugify(category)}`.split(/[\s-]+/).filter(Boolean)),
  )
}

export async function createService(input: {
  name: string
  description: string
  category: Service["category"]
  estimatedDuration: number
  requiresDisclaimer: boolean
  isActive: boolean
}): Promise<Service> {
  const createdAt = new Date().toISOString()
  const ref = adminDb.collection(COLLECTION).doc()
  const data = {
    name: input.name,
    slug: slugify(input.name),
    description: input.description,
    category: input.category,
    estimatedDuration: input.estimatedDuration,
    requiresDisclaimer: input.requiresDisclaimer,
    isActive: input.isActive,
    searchTokens: buildServiceSearchTokens(input.name, input.description, input.category),
    createdAt,
    updatedAt: createdAt,
  }

  await ref.set(data)
  return docToService(ref.id, data)
}

export async function updateService(
  id: string,
  input: {
    name?: string
    description?: string
    category?: Service["category"]
    estimatedDuration?: number
    requiresDisclaimer?: boolean
    isActive?: boolean
  },
): Promise<Service> {
  const current = await getServiceById(id)
  if (!current) throw new Error("SERVICE_NOT_FOUND")

  const name = input.name ?? current.name
  const description = input.description ?? current.description
  const category = input.category ?? current.category

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
    slug: slugify(name),
    searchTokens: buildServiceSearchTokens(name, description, category),
  }

  if (input.name !== undefined) updates["name"] = input.name
  if (input.description !== undefined) updates["description"] = input.description
  if (input.category !== undefined) updates["category"] = input.category
  if (input.estimatedDuration !== undefined) updates["estimatedDuration"] = input.estimatedDuration
  if (input.requiresDisclaimer !== undefined) updates["requiresDisclaimer"] = input.requiresDisclaimer
  if (input.isActive !== undefined) updates["isActive"] = input.isActive

  await adminDb.collection(COLLECTION).doc(id).update(updates)
  const updated = await adminDb.collection(COLLECTION).doc(id).get()
  return docToService(updated.id, updated.data()!)
}
