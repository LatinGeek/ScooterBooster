/**
 * Firestore data access layer — technicians collection
 * Server-side only (uses Admin SDK)
 */
import { unstable_cache as nextCache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { getBrandById } from "@/lib/db/brands"
import { getServicesByIds } from "@/lib/db/services"
import type { Technician } from "@/types"

const COLLECTION = "technicians"

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
}

function buildSearchTokens(...values: Array<string | undefined | null>): string[] {
  const tokens = new Set<string>()

  for (const value of values) {
    if (!value) continue
    for (const token of normalizeSearchText(value).split(" ")) {
      if (token) tokens.add(token)
    }
  }

  return [...tokens]
}

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
    normalizedLocation: (data["normalizedLocation"] as string | undefined) ?? undefined,
    searchTokens: (data["searchTokens"] as string[]) ?? [],
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

/** Get all approved + active technicians with optional filters.
 *  Cached per opts combination for 5 min; busted by 'technicians' tag. */
export function getActiveTechnicians(opts: GetTechniciansOptions = {}): Promise<Technician[]> {
  const cacheKey = `technicians-active-${opts.serviceId ?? ""}-${opts.brandId ?? ""}-${opts.sortBy ?? "rating"}-${opts.limit ?? 0}`
  return nextCache(
    async () => _getActiveTechnicians(opts),
    [cacheKey],
    { tags: ["technicians"], revalidate: 300 },
  )()
}

async function _getActiveTechnicians(
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

  const shouldRefreshSearchIndex =
    input.displayName !== undefined ||
    input.bio !== undefined ||
    input.location !== undefined ||
    input.services !== undefined ||
    input.supportedBrands !== undefined

  if (shouldRefreshSearchIndex) {
    const existing = await getTechnicianById(id)
    if (!existing) {
      throw new Error(`Technician ${id} not found while refreshing search index`)
    }

    const displayName = input.displayName ?? existing.displayName
    const bio = input.bio ?? existing.bio
    const location = input.location ?? existing.location
    const services = input.services ?? existing.services
    const supportedBrands = input.supportedBrands ?? existing.supportedBrands

    const [serviceDocs, brandDocs] = await Promise.all([
      getServicesByIds(services),
      Promise.all(supportedBrands.map((brandId) => getBrandById(brandId))),
    ])

    updates["normalizedLocation"] = normalizeSearchText(location)
    updates["searchTokens"] = buildSearchTokens(
      displayName,
      bio,
      location,
      ...serviceDocs.map((service) => service.name),
      ...brandDocs.map((brand) => brand?.name)
    )
  }

  await adminDb.collection(COLLECTION).doc(id).update(updates)
  const doc = await adminDb.collection(COLLECTION).doc(id).get()
  return docToTechnician(doc.id, doc.data()!)
}
