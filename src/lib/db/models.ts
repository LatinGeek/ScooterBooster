/**
 * Firestore data access layer — scooterModels collection
 * Server-side only (uses Admin SDK)
 */
import { existsSync, statSync } from "node:fs"
import path from "node:path"

import { adminDb } from "@/lib/firebase-admin"
import { slugify } from "@/lib/slugs"
import type { ScooterModel } from "@/types"

const COLLECTION = "scooterModels"
const LOCAL_MODEL_IMAGE_PREFIX = "/assets/scooter-model-images/"
const LOCAL_MODEL_IMAGE_SUFFIX = "-refresh-20260502"
const localModelImageCache = new Map<string, string | null>()

function buildVersionedLocalAssetURL(assetURL: string, assetPath: string): string {
  return `${assetURL}?v=${statSync(assetPath).mtimeMs.toFixed(0)}`
}

function buildLocalAssetPath(assetURL: string): string {
  return path.join(process.cwd(), "public", assetURL.replace(/^\//, "").replaceAll("/", path.sep))
}

function resolveExistingLocalAsset(assetURL: string): string | null {
  const assetPath = buildLocalAssetPath(assetURL)
  if (!existsSync(assetPath)) return null
  return buildVersionedLocalAssetURL(assetURL, assetPath)
}

function buildLocalAssetCandidates(assetURL: string): string[] {
  const extension = path.extname(assetURL)
  if (!extension) return [assetURL]

  const basePath = assetURL.slice(0, -extension.length)
  if (basePath.endsWith(LOCAL_MODEL_IMAGE_SUFFIX)) {
    return [assetURL]
  }

  return [`${basePath}${LOCAL_MODEL_IMAGE_SUFFIX}${extension}`, assetURL]
}

function resolveModelImageURL(imageURL: string | null | undefined): string | null {
  if (!imageURL) return null

  if (!imageURL.startsWith(LOCAL_MODEL_IMAGE_PREFIX)) {
    return imageURL
  }

  const extension = path.extname(imageURL)
  if (!extension) return imageURL

  const cached = localModelImageCache.get(imageURL)
  if (cached !== undefined) {
    return cached
  }

  const versionedURL = buildLocalAssetCandidates(imageURL)
    .map((candidateURL) => resolveExistingLocalAsset(candidateURL))
    .find((candidateURL): candidateURL is string => candidateURL !== null) ?? null

  localModelImageCache.set(imageURL, versionedURL)
  return versionedURL
}

function docToScooterModel(id: string, data: FirebaseFirestore.DocumentData): ScooterModel {
  return {
    id,
    brandId: data["brandId"] as string,
    name: data["name"] as string,
    slug: data["slug"] as string,
    imageURL: resolveModelImageURL((data["imageURL"] as string | null) ?? null),
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
