import { adminDb } from "@/lib/firebase-admin"
import type { PaymentLinkRecord, PaymentLinkStatus } from "@/types"

const COLLECTION = "paymentLinks"

function toIso(value: unknown): string {
  if (typeof value === "string") return value
  if (value && typeof (value as FirebaseFirestore.Timestamp).toDate === "function") {
    return (value as FirebaseFirestore.Timestamp).toDate().toISOString()
  }
  return ""
}

function docToPaymentLinkRecord(
  id: string,
  data: FirebaseFirestore.DocumentData,
): PaymentLinkRecord {
  return {
    id,
    bookingId: data["bookingId"] as string,
    initPoint: data["initPoint"] as string,
    externalReference: data["externalReference"] as string,
    status: data["status"] as PaymentLinkStatus,
    paymentId: (data["paymentId"] as string | null) ?? null,
    lastWebhookEventId: (data["lastWebhookEventId"] as string | null) ?? null,
    createdAt: toIso(data["createdAt"]),
    updatedAt: toIso(data["updatedAt"]),
  }
}

export async function upsertPaymentLinkRecord(input: {
  preferenceId: string
  bookingId: string
  initPoint: string
}): Promise<PaymentLinkRecord> {
  const now = new Date().toISOString()
  const data: Omit<PaymentLinkRecord, "id"> = {
    bookingId: input.bookingId,
    initPoint: input.initPoint,
    externalReference: `booking_${input.bookingId}`,
    status: "pending",
    paymentId: null,
    lastWebhookEventId: null,
    createdAt: now,
    updatedAt: now,
  }

  await adminDb.collection(COLLECTION).doc(input.preferenceId).set(data, { merge: true })
  return { id: input.preferenceId, ...data }
}

export async function updatePaymentLinkStatus(input: {
  preferenceId: string
  status: PaymentLinkStatus
  paymentId?: string | null
  lastWebhookEventId?: string | null
}): Promise<void> {
  await adminDb
    .collection(COLLECTION)
    .doc(input.preferenceId)
    .set(
      {
        status: input.status,
        paymentId: input.paymentId ?? null,
        lastWebhookEventId: input.lastWebhookEventId ?? null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )
}

export async function getPaymentLinksByBookingId(bookingId: string): Promise<PaymentLinkRecord[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("bookingId", "==", bookingId)
    .orderBy("createdAt", "desc")
    .get()

  return snap.docs.map((doc) => docToPaymentLinkRecord(doc.id, doc.data()))
}
