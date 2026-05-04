/**
 * One-time migration:
 * Backfill pricingMatrix on existing technician docs from legacy services,
 * supportedBrands, and pricing fields.
 *
 * Usage: npx tsx scripts/migrate-pricing-matrix.ts
 */

import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import * as dotenv from "dotenv"
import * as path from "path"
import { normalizeMatrixInput } from "@/lib/technician-matrix"
import type { Technician } from "@/types"

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

const db = getFirestore()
const collection = db.collection("technicians")

function buildMatrixFromLegacyFields(
  technician: Pick<Technician, "services" | "supportedBrands" | "pricing">,
  modelsByBrand: Map<string, Array<{ id: string; brandId: string; compatibleServices: string[] }>>
): Technician["pricingMatrix"] {
  const matrix: Technician["pricingMatrix"] = {}

  for (const serviceId of technician.services ?? []) {
    const basePrice = technician.pricing?.[serviceId]?.basePrice ?? 0
    matrix[serviceId] = {}

    for (const brandId of technician.supportedBrands ?? []) {
      for (const model of modelsByBrand.get(brandId) ?? []) {
        if (!model.compatibleServices.includes(serviceId)) continue

        matrix[serviceId][model.id] = {
          price: basePrice,
          currency: "UYU",
          isAvailable: true,
        }
      }
    }
  }

  return normalizeMatrixInput(matrix)
}

async function main() {
  const modelsSnap = await db.collection("scooterModels").get()
  const models = modelsSnap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as { brandId: string; compatibleServices: string[] }),
  }))
  const modelsByBrand = new Map<string, Array<{ id: string; brandId: string; compatibleServices: string[] }>>()

  for (const model of models) {
    const existing = modelsByBrand.get(model.brandId) ?? []
    existing.push(model)
    modelsByBrand.set(model.brandId, existing)
  }

  const snap = await collection.get()
  let updated = 0

  for (const doc of snap.docs) {
    const data = doc.data() as Technician
    const hasMatrix = Boolean(data.pricingMatrix && Object.keys(data.pricingMatrix).length > 0)
    if (hasMatrix) {
      continue
    }

    const pricingMatrix = buildMatrixFromLegacyFields(data, modelsByBrand)
    await doc.ref.update({
      pricingMatrix,
      updatedAt: new Date().toISOString(),
    })
    updated += 1
    console.log(`Updated ${doc.id}`)
  }

  console.log(`Migration complete. Updated ${updated} technician docs.`)
}

main().catch((error) => {
  console.error("Pricing matrix migration failed:", error)
  process.exit(1)
})
