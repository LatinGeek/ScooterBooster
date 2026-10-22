/** Scoped catalog update. Preview: npx tsx scripts/enable-segway-uruguay.ts
 * Apply: npx tsx scripts/enable-segway-uruguay.ts --apply
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { config } from "dotenv"
import { cert, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

import {
  buildSegwayTechnicianUpdate,
  SEGWAY_CATALOG,
  SEGWAY_SERVICE_PRICES,
  SEGWAY_TECHNICIAN_ID,
} from "@/lib/segway-catalog"
import type { Technician } from "@/types"

config({ path: ".env.local", quiet: true })
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
})
const db = getFirestore()

async function main() {
  const apply = process.argv.includes("--apply")
  for (const { model } of SEGWAY_CATALOG) {
    if (!existsSync(path.join(process.cwd(), "public", model.imageURL!))) {
      throw new Error(`Missing local image for ${model.name}`)
    }
  }
  const technicianRef = db.collection("technicians").doc(SEGWAY_TECHNICIAN_ID)
  const [technician, models, brand, services] = await Promise.all([
    technicianRef.get(),
    db.collection("scooterModels").get(),
    db.collection("scooterBrands").doc("brand-segway").get(),
    db.getAll(...Object.keys(SEGWAY_SERVICE_PRICES).map((id) => db.collection("services").doc(id))),
  ])
  const technicianData = technician.data()
  if (!technicianData?.isApproved || !technicianData.isActive) {
    throw new Error("The confirmed technician must be active and approved")
  }
  if (!technicianData.pricingMatrix || Object.keys(technicianData.pricingMatrix).length === 0) {
    throw new Error("Expected existing pricing matrix; refusing to replace legacy pricing")
  }
  if (!brand.data()?.isActive || services.some((service) => !service.data()?.isActive)) {
    throw new Error("Segway brand and both services must be active")
  }
  for (const { model } of SEGWAY_CATALOG) {
    if (models.docs.some((doc) => doc.id !== model.id && doc.data().slug === model.slug)) {
      throw new Error(`Duplicate slug: ${model.slug}`)
    }
  }
  const modelBrandMap = Object.fromEntries(
    models.docs.map((doc) => [doc.id, doc.data().brandId as string])
  )
  const update = buildSegwayTechnicianUpdate(
    technicianData.pricingMatrix as Technician["pricingMatrix"],
    modelBrandMap
  )
  const searchTokens = Array.from(
    new Set([
      ...((technicianData.searchTokens as string[]) ?? []),
      "segway",
      "ninebot",
      "segway-ninebot",
    ])
  )
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "preview",
        technician: technicianData.displayName,
        models: SEGWAY_CATALOG.map(({ model }) => ({
          id: model.id,
          name: model.name,
          bookingFeeAmount: model.bookingFeeAmount,
        })),
        prices: SEGWAY_SERVICE_PRICES,
      },
      null,
      2
    )
  )
  if (!apply) return

  const modelSnapshots = SEGWAY_CATALOG.map(({ model }) =>
    models.docs.find((doc) => doc.id === model.id)
  )
  const backupDirectory = path.resolve("tmp", "segway-backups")
  mkdirSync(backupDirectory, { recursive: true })
  const backupPath = path.join(
    backupDirectory,
    `${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  )
  writeFileSync(
    backupPath,
    JSON.stringify(
      {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        documents: [
          { path: technicianRef.path, exists: true, data: technicianData },
          ...SEGWAY_CATALOG.map(({ model }, index) => ({
            path: `scooterModels/${model.id}`,
            exists: Boolean(modelSnapshots[index]),
            data: modelSnapshots[index]?.data() ?? null,
          })),
        ],
      },
      null,
      2
    ),
    { encoding: "utf8", flag: "wx" }
  )

  await db.runTransaction(async (transaction) => {
    const modelRefs = SEGWAY_CATALOG.map(({ model }) =>
      db.collection("scooterModels").doc(model.id)
    )
    const current = await transaction.getAll(technicianRef, ...modelRefs)
    const before = [technician, ...modelSnapshots]
    for (let index = 0; index < current.length; index++) {
      const previous = before[index]
      if (
        current[index]!.exists !== Boolean(previous?.exists) ||
        (previous?.updateTime && !current[index]!.updateTime?.isEqual(previous.updateTime))
      ) {
        throw new Error("Affected data changed after backup; rerun to capture a fresh backup")
      }
    }
    const now = new Date().toISOString()
    for (const [index, { model }] of SEGWAY_CATALOG.entries()) {
      const { id, ...data } = model
      transaction.set(
        db.collection("scooterModels").doc(id),
        {
          ...data,
          createdAt: modelSnapshots[index]?.data().createdAt ?? now,
          updatedAt: now,
        },
        { merge: true }
      )
    }
    transaction.update(technicianRef, { ...update, searchTokens, updatedAt: now })
  })
  console.log(`Applied three models and six service combinations. Backup: ${backupPath}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
