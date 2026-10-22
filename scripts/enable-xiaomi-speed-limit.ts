/** Copy the Xiaomi 6 base's speed-limit pricing to existing Xiaomi models.
 * Preview: npx tsx scripts/enable-xiaomi-speed-limit.ts xiaomi-6-lite
 * Apply: add --apply. Only explicitly named models are updated.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { config } from "dotenv"
import { cert, initializeApp } from "firebase-admin/app"
import { FieldValue, getFirestore } from "firebase-admin/firestore"
import { XIAOMI_ESSENTIAL } from "@/lib/xiaomi-essential-catalog"

config({ path: ".env.local", quiet: true })
initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
})
const db = getFirestore()
const sourceId = "xiaomi-6-standard"
const serviceId = "speed-limit"

async function main() {
  const apply = process.argv.includes("--apply")
  const targetIds = [...new Set(process.argv.slice(2).filter((arg) => arg !== "--apply"))]
  if (!targetIds.length || targetIds.some((id) => !id.startsWith("xiaomi-") || id === sourceId)) {
    throw new Error("Specify existing Xiaomi model IDs other than the source model")
  }
  const [source, targets, technicians, service] = await Promise.all([
    db.collection("scooterModels").doc(sourceId).get(),
    db.getAll(...targetIds.map((id) => db.collection("scooterModels").doc(id))),
    db.collection("technicians").get(),
    db.collection("services").doc(serviceId).get(),
  ])
  const sourceData = source.data()
  if (
    !sourceData?.isActive ||
    !sourceData.compatibleServices?.includes(serviceId) ||
    !Number.isFinite(sourceData.bookingFeeAmount) ||
    !service.data()?.isActive
  ) {
    throw new Error("Source model must have active speed-limit service and explicit booking fee")
  }
  for (const target of targets) {
    if (!target.exists && target.id === XIAOMI_ESSENTIAL.id) continue
    if (!target.exists || target.data()?.brandId !== "brand-xiaomi" || !target.data()?.isActive) {
      throw new Error(`Missing or inactive Xiaomi model: ${target.id}`)
    }
  }
  const matchingTechnicians = technicians.docs.filter((doc) => {
    const data = doc.data()
    return (
      data.isActive && data.isApproved && data.pricingMatrix?.[serviceId]?.[sourceId]?.isAvailable
    )
  })
  if (!matchingTechnicians.length) throw new Error("No active technician offers the source service")
  for (const technician of matchingTechnicians) {
    const entry = technician.data().pricingMatrix[serviceId][sourceId]
    if (!Number.isFinite(entry.price) || entry.price < 0 || entry.currency !== "UYU") {
      throw new Error(`Invalid source pricing: ${technician.id}`)
    }
  }
  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "preview",
        models: targets.map((doc) => ({
          id: doc.id,
          name: doc.data()?.name ?? XIAOMI_ESSENTIAL.name,
        })),
        bookingFeeAmount: sourceData.bookingFeeAmount,
        technicians: matchingTechnicians.map((doc) => ({
          id: doc.id,
          pricing: doc.data().pricingMatrix[serviceId][sourceId],
        })),
      },
      null,
      2
    )
  )
  if (!apply) return

  const snapshots = [source, service, ...targets, ...matchingTechnicians]
  const backupDirectory = path.resolve("tmp", "xiaomi-speed-limit-backups")
  mkdirSync(backupDirectory, { recursive: true })
  const backupPath = path.join(
    backupDirectory,
    `${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  )
  writeFileSync(
    backupPath,
    JSON.stringify(
      snapshots.map((doc) => ({
        path: doc.ref.path,
        exists: doc.exists,
        data: doc.data() ?? null,
      })),
      null,
      2
    ),
    { encoding: "utf8", flag: "wx" }
  )

  await db.runTransaction(async (transaction) => {
    const current = await transaction.getAll(...snapshots.map((doc) => doc.ref))
    for (const [index, doc] of current.entries()) {
      const before = snapshots[index]!
      if (
        doc.exists !== before.exists ||
        (before.exists && !doc.updateTime?.isEqual(before.updateTime!))
      ) {
        throw new Error("Data changed after backup; rerun to capture current data")
      }
    }
    const updatedAt = new Date().toISOString()
    for (const target of targets) {
      if (!target.exists) {
        const { id, ...model } = XIAOMI_ESSENTIAL
        if (target.id !== id) throw new Error("Unexpected new model")
        transaction.create(target.ref, {
          ...model,
          bookingFeeAmount: sourceData.bookingFeeAmount,
          createdAt: updatedAt,
          updatedAt,
        })
        continue
      }
      transaction.update(target.ref, {
        compatibleServices: FieldValue.arrayUnion(serviceId),
        bookingFeeAmount: sourceData.bookingFeeAmount,
        searchTokens: FieldValue.arrayUnion("eliminacion", "de", "limite", "velocidad"),
        updatedAt,
      })
    }
    for (const technician of matchingTechnicians) {
      const updates: Record<string, unknown> = { updatedAt }
      for (const targetId of targetIds) {
        updates[`pricingMatrix.${serviceId}.${targetId}`] =
          technician.data().pricingMatrix[serviceId][sourceId]
      }
      transaction.update(technician.ref, updates)
    }
  })

  for (const target of targets) {
    const data = (await target.ref.get()).data()!
    if (
      !data.compatibleServices.includes(serviceId) ||
      data.bookingFeeAmount !== sourceData.bookingFeeAmount
    ) {
      throw new Error(`Model verification failed: ${target.id}`)
    }
  }
  for (const technician of matchingTechnicians) {
    const data = (await technician.ref.get()).data()!
    const sourceEntry = data.pricingMatrix[serviceId][sourceId]
    for (const targetId of targetIds) {
      const entry = data.pricingMatrix[serviceId][targetId]
      if (
        entry.price !== sourceEntry.price ||
        entry.currency !== sourceEntry.currency ||
        !entry.isAvailable
      ) {
        throw new Error(`Pricing verification failed: ${technician.id}/${targetId}`)
      }
    }
  }
  console.log(`Applied and verified. Backup: ${backupPath}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
