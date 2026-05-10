/**
 * Firestore data access layer for global platform settings.
 * Server-side only (uses Admin SDK).
 */
import { adminDb } from "@/lib/firebase-admin"
import { DEFAULT_SERVICE_FEE_AMOUNT } from "@/lib/pricing"

const COLLECTION = "config"
const DOC_ID = "global"

export interface PlatformSettings {
  serviceFeeAmount: number
}

function normalizeServiceFeeAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_SERVICE_FEE_AMOUNT
  }

  return Math.max(0, Math.round(value))
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const snap = await adminDb.collection(COLLECTION).doc(DOC_ID).get()
  const data = snap.exists ? snap.data() : null

  return {
    serviceFeeAmount: normalizeServiceFeeAmount(data?.["serviceFeeAmount"]),
  }
}
