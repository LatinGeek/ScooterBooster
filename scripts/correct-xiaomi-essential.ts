/** Correct the Essential catalog entry without changing its stable document ID. */
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { config } from "dotenv"
import { cert, initializeApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

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

async function main() {
  const ref = db.collection("scooterModels").doc(XIAOMI_ESSENTIAL.id)
  const before = await ref.get()
  if (!before.exists || before.data()?.brandId !== XIAOMI_ESSENTIAL.brandId) {
    throw new Error("Expected existing Xiaomi Essential catalog entry")
  }
  const { name, slug, specs, searchTokens } = XIAOMI_ESSENTIAL
  const duplicate = await db.collection("scooterModels").where("slug", "==", slug).get()
  if (duplicate.docs.some((doc) => doc.id !== ref.id)) throw new Error("Duplicate Essential slug")
  const updates = { name, slug, specs, searchTokens }
  console.log(
    JSON.stringify(
      { mode: process.argv.includes("--apply") ? "apply" : "preview", ...updates },
      null,
      2
    )
  )
  if (!process.argv.includes("--apply")) return
  const backupDirectory = path.resolve("tmp", "xiaomi-speed-limit-backups")
  mkdirSync(backupDirectory, { recursive: true })
  writeFileSync(
    path.join(backupDirectory, `essential-correction-${Date.now()}.json`),
    JSON.stringify({ path: ref.path, data: before.data() }, null, 2),
    { encoding: "utf8", flag: "wx" }
  )
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref)
    if (!current.updateTime?.isEqual(before.updateTime!)) throw new Error("Model changed; rerun")
    transaction.update(ref, { ...updates, updatedAt: new Date().toISOString() })
  })
  const after = (await ref.get()).data()!
  for (const [key, value] of Object.entries(updates)) {
    if (JSON.stringify(after[key]) !== JSON.stringify(value)) {
      // Firestore may return object fields in a different order.
      if (
        key !== "specs" ||
        Object.entries(specs).some(([field, expected]) => after.specs[field] !== expected)
      ) {
        throw new Error(`Verification failed: ${key}`)
      }
    }
  }
  if (
    after.bookingFeeAmount !== before.data()!.bookingFeeAmount ||
    JSON.stringify(after.compatibleServices) !== JSON.stringify(before.data()!.compatibleServices)
  ) {
    throw new Error("Service configuration changed unexpectedly")
  }
  console.log("Essential corrected and verified; service configuration preserved.")
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
