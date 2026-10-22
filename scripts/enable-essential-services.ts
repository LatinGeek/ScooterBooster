/** Enable Essential maintenance and firmware. Preview by default; use --apply to save. */
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
const services = ["maintenance", "firmware"]

async function main() {
  const modelRef = db.collection("scooterModels").doc(XIAOMI_ESSENTIAL.id)
  const [model, technicians, serviceDocs] = await Promise.all([
    modelRef.get(),
    db.collection("technicians").get(),
    db.getAll(...services.map((id) => db.collection("services").doc(id))),
  ])
  if (
    !model.data()?.isActive ||
    model.data()?.slug !== XIAOMI_ESSENTIAL.slug ||
    serviceDocs.some((doc) => !doc.data()?.isActive)
  ) {
    throw new Error("Expected active Essential and services")
  }
  const matching = technicians.docs.filter((doc) => {
    const data = doc.data()
    return (
      data.isActive &&
      data.isApproved &&
      data.pricingMatrix?.["speed-limit"]?.[model.id]?.isAvailable
    )
  })
  if (!matching.length) throw new Error("No existing active Essential technician")
  const updates = matching.map((doc) => {
    const entries = Object.fromEntries(
      services.map((serviceId) => {
        const entry = doc.data().pricingMatrix?.[serviceId]?.["xiaomi-6-standard"]
        if (
          !entry ||
          !Number.isFinite(entry.price) ||
          entry.price < 0 ||
          entry.currency !== "UYU"
        ) {
          throw new Error(`Missing valid reference price: ${doc.id}/${serviceId}`)
        }
        return [serviceId, { ...entry, isAvailable: true }]
      })
    )
    return { doc, entries }
  })
  console.log(
    JSON.stringify(
      updates.map(({ doc, entries }) => ({ technicianId: doc.id, entries })),
      null,
      2
    )
  )
  if (!process.argv.includes("--apply")) return
  const snapshots = [model, ...serviceDocs, ...matching]
  const directory = path.resolve("tmp", "xiaomi-speed-limit-backups")
  mkdirSync(directory, { recursive: true })
  writeFileSync(
    path.join(directory, `essential-services-${Date.now()}.json`),
    JSON.stringify(
      snapshots.map((doc) => ({ path: doc.ref.path, data: doc.data() })),
      null,
      2
    ),
    { encoding: "utf8", flag: "wx" }
  )
  await db.runTransaction(async (transaction) => {
    const current = await transaction.getAll(...snapshots.map((doc) => doc.ref))
    if (current.some((doc, index) => !doc.updateTime?.isEqual(snapshots[index]!.updateTime!))) {
      throw new Error("Data changed; rerun to capture a fresh backup")
    }
    const updatedAt = new Date().toISOString()
    transaction.update(modelRef, {
      compatibleServices: FieldValue.arrayUnion(...services),
      searchTokens: FieldValue.arrayUnion(...XIAOMI_ESSENTIAL.searchTokens),
      updatedAt,
    })
    for (const { doc, entries } of updates) {
      const fields: Record<string, unknown> = { updatedAt }
      for (const [serviceId, entry] of Object.entries(entries)) {
        fields[`pricingMatrix.${serviceId}.${model.id}`] = entry
      }
      transaction.update(doc.ref, fields)
    }
  })
  const savedModel = (await modelRef.get()).data()!
  if (services.some((id) => !savedModel.compatibleServices.includes(id)))
    throw new Error("Model verification failed")
  for (const { doc, entries } of updates) {
    const saved = (await doc.ref.get()).data()!
    for (const [serviceId, expected] of Object.entries(entries)) {
      const entry = saved.pricingMatrix[serviceId][model.id]
      if (
        !entry?.isAvailable ||
        entry.price !== expected.price ||
        entry.currency !== expected.currency
      ) {
        throw new Error(`Pricing verification failed: ${doc.id}/${serviceId}`)
      }
    }
  }
  console.log("Essential maintenance and firmware enabled and verified.")
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
