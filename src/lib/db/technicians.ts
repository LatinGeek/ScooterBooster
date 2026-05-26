/**
 * Firestore data access layer — technicians collection
 * Server-side only (uses Admin SDK)
 */
import { unstable_cache as nextCache } from "next/cache"
import { adminDb } from "@/lib/firebase-admin"
import { getBrandById } from "@/lib/db/brands"
import { getAllModels } from "@/lib/db/models"
import { getServicesByIds } from "@/lib/db/services"
import { slugify } from "@/lib/slugs"
import { getCoordinatesForLocation } from "@/lib/uruguay-locations"
import { deriveLegacyFieldsFromMatrix, normalizeMatrixInput } from "@/lib/technician-matrix"
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

async function buildLegacyFieldsFromMatrix(matrix: Technician["pricingMatrix"]) {
  const modelDocs = await getAllModels()
  const modelBrandMap = Object.fromEntries(modelDocs.map((model) => [model.id, model.brandId]))
  return deriveLegacyFieldsFromMatrix(matrix, modelBrandMap)
}

function docToTechnician(id: string, data: FirebaseFirestore.DocumentData): Technician {
  const applicationStatus =
    (data["applicationStatus"] as Technician["applicationStatus"] | undefined) ??
    (Boolean(data["isApproved"]) ? "approved" : Boolean(data["isActive"]) ? "pending" : "rejected")

  return {
    id,
    slug: (data["slug"] as string | undefined) ?? slugify(data["displayName"] as string),
    userId: data["userId"] as string,
    displayName: data["displayName"] as string,
    bio: data["bio"] as string,
    photoURL: data["photoURL"] as string,
    phone: data["phone"] as string,
    whatsappNumber: data["whatsappNumber"] as string,
    location: data["location"] as string,
    coordinates:
      data["coordinates"] &&
      typeof data["coordinates"] === "object" &&
      typeof data["coordinates"].lat === "number" &&
      typeof data["coordinates"].lng === "number"
        ? {
            lat: data["coordinates"].lat as number,
            lng: data["coordinates"].lng as number,
          }
        : null,
    pricingMatrix: normalizeMatrixInput(
      (data["pricingMatrix"] as Technician["pricingMatrix"]) ?? undefined
    ),
    services: (data["services"] as string[]) ?? [],
    supportedBrands: (data["supportedBrands"] as string[]) ?? [],
    availability: (data["availability"] as Technician["availability"]) ?? {},
    pricing: (data["pricing"] as Technician["pricing"]) ?? {},
    rating: (data["rating"] as number) ?? 0,
    reviewCount: (data["reviewCount"] as number) ?? 0,
    isApproved: Boolean(data["isApproved"]),
    isActive: Boolean(data["isActive"]),
    applicationStatus,
    moderationReason: (data["moderationReason"] as string | null | undefined) ?? null,
    moderatedAt: (data["moderatedAt"] as string | null | undefined) ?? null,
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

export async function getTechnicianBySlug(slug: string): Promise<Technician | null> {
  const snap = await adminDb.collection(COLLECTION).where("slug", "==", slug).limit(1).get()
  if (!snap.empty) {
    const doc = snap.docs[0]
    if (doc) return docToTechnician(doc.id, doc.data())
  }

  const allTechnicians = await getAllTechnicians()
  return allTechnicians.find((technician) => technician.slug === slug) ?? null
}

export async function getTechnicianByIdentifier(identifier: string): Promise<Technician | null> {
  const byId = await getTechnicianById(identifier)
  if (byId) return byId

  return getTechnicianBySlug(identifier)
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

export async function getLatestTechnicians(limit = 200): Promise<Technician[]> {
  const snap = await adminDb.collection(COLLECTION).orderBy("createdAt", "desc").limit(limit).get()
  return snap.docs.map((doc) => docToTechnician(doc.id, doc.data()))
}

/** Update technician approval status */
export async function setTechnicianApproval(id: string, isApproved: boolean): Promise<void> {
  await adminDb.collection(COLLECTION).doc(id).update({
    isApproved,
    applicationStatus: isApproved ? "approved" : "rejected",
    moderationReason: null,
    moderatedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

export async function setTechnicianApplicationStatus(
  id: string,
  input: {
    status: "pending" | "request_changes" | "rejected" | "approved"
    reason?: string | null
  }
): Promise<void> {
  const now = new Date().toISOString()
  await adminDb.collection(COLLECTION).doc(id).update({
    isApproved: input.status === "approved",
    isActive: input.status !== "rejected",
    applicationStatus: input.status,
    moderationReason: input.reason ?? null,
    moderatedAt: now,
    updatedAt: now,
  })
}

export interface UpdateTechnicianInput {
  displayName?: string
  bio?: string
  photoURL?: string
  phone?: string
  whatsappNumber?: string
  location?: string
  coordinates?: Technician["coordinates"]
  services?: string[]
  supportedBrands?: string[]
  availability?: Technician["availability"]
  pricing?: Technician["pricing"]
  pricingMatrix?: Technician["pricingMatrix"]
  isActive?: boolean
}

export interface CreateTechnicianApplicationInput {
  id: string
  userId: string
  displayName: string
  bio: string
  photoURL: string
  phone: string
  whatsappNumber: string
  location: string
  coordinates?: Technician["coordinates"]
  services: string[]
  supportedBrands: string[]
  pricing: Technician["pricing"]
  availability: Technician["availability"]
  pricingMatrix?: Technician["pricingMatrix"]
}

export async function createTechnicianApplication(
  input: CreateTechnicianApplicationInput
): Promise<Technician> {
  const matrix = normalizeMatrixInput(input.pricingMatrix)
  const derivedFields = input.pricingMatrix !== undefined ? await buildLegacyFieldsFromMatrix(matrix) : null
  const matrixFields = derivedFields ?? {
    services: input.services,
    supportedBrands: input.supportedBrands,
    pricing: input.pricing,
  }
  const services = matrixFields.services
  const supportedBrands = matrixFields.supportedBrands
  const pricing = matrixFields.pricing
  const serviceDocs = await getServicesByIds(services)
  const brandDocs = await Promise.all(supportedBrands.map((brandId) => getBrandById(brandId)))
  const timestamp = new Date().toISOString()

  await adminDb
    .collection(COLLECTION)
    .doc(input.id)
    .set({
      userId: input.userId,
      slug: slugify(input.displayName),
      displayName: input.displayName,
      bio: input.bio,
      photoURL: input.photoURL,
      phone: input.phone,
      whatsappNumber: input.whatsappNumber,
      location: input.location,
      coordinates: input.coordinates ?? getCoordinatesForLocation(input.location),
      pricingMatrix: matrix,
      services,
      supportedBrands,
      availability: input.availability,
      pricing,
      rating: 0,
      reviewCount: 0,
      isApproved: false,
      isActive: true,
      applicationStatus: "pending",
      moderationReason: null,
      moderatedAt: null,
      normalizedLocation: normalizeSearchText(input.location),
      searchTokens: buildSearchTokens(
        input.displayName,
        input.bio,
        input.location,
        ...serviceDocs.map((service) => service.name),
        ...brandDocs.map((brand) => brand?.name)
      ),
      createdAt: timestamp,
      updatedAt: timestamp,
    })

  const created = await adminDb.collection(COLLECTION).doc(input.id).get()
  return docToTechnician(created.id, created.data()!)
}

/** Update a technician's own profile fields */
export async function updateTechnicianProfile(
  id: string,
  input: UpdateTechnicianInput
): Promise<Technician> {
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  const matrixProvided = input.pricingMatrix !== undefined
  const normalizedMatrix = matrixProvided ? normalizeMatrixInput(input.pricingMatrix) : undefined
  const derivedFields = matrixProvided ? await buildLegacyFieldsFromMatrix(normalizedMatrix) : null
  const matrixFields = derivedFields ?? null

  const fields = [
    "displayName",
    "bio",
    "photoURL",
    "phone",
    "whatsappNumber",
    "location",
    "coordinates",
    "services",
    "supportedBrands",
    "availability",
    "pricing",
    "pricingMatrix",
    "isActive",
  ] as const
  for (const f of fields) {
    if (f === "pricingMatrix") continue
    if (input[f] !== undefined) updates[f] = input[f]
  }

  if (matrixProvided) {
    updates["pricingMatrix"] = normalizedMatrix
    updates["services"] = matrixFields!.services
    updates["supportedBrands"] = matrixFields!.supportedBrands
    updates["pricing"] = matrixFields!.pricing
  }

  const shouldRefreshSearchIndex =
    input.displayName !== undefined ||
    input.bio !== undefined ||
    input.location !== undefined ||
    input.services !== undefined ||
    input.supportedBrands !== undefined ||
    matrixProvided

  if (shouldRefreshSearchIndex) {
    const existing = await getTechnicianById(id)
    if (!existing) {
      throw new Error(`Technician ${id} not found while refreshing search index`)
    }

    const displayName = input.displayName ?? existing.displayName
    const bio = input.bio ?? existing.bio
    const location = input.location ?? existing.location
    const coordinates =
      input.coordinates !== undefined
        ? input.coordinates
        : (existing.coordinates ?? getCoordinatesForLocation(location))
    const services = matrixProvided ? matrixFields!.services : input.services ?? existing.services
    const supportedBrands = matrixProvided
      ? matrixFields!.supportedBrands
      : input.supportedBrands ?? existing.supportedBrands

    const [serviceDocs, brandDocs] = await Promise.all([
      getServicesByIds(services),
      Promise.all(supportedBrands.map((brandId) => getBrandById(brandId))),
    ])

    updates["normalizedLocation"] = normalizeSearchText(location)
    updates["coordinates"] = coordinates
    updates["slug"] = slugify(displayName)
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

export async function resubmitTechnicianApplication(
  id: string,
  input: UpdateTechnicianInput
): Promise<Technician> {
  await updateTechnicianProfile(id, input)
  await adminDb.collection(COLLECTION).doc(id).update({
    isApproved: false,
    isActive: true,
    applicationStatus: "pending",
    moderationReason: null,
    moderatedAt: null,
    updatedAt: new Date().toISOString(),
  })

  const doc = await adminDb.collection(COLLECTION).doc(id).get()
  return docToTechnician(doc.id, doc.data()!)
}
