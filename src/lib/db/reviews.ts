/**
 * Firestore data access layer — reviews collection
 * Server-side only (uses Admin SDK)
 */
import { adminDb } from "@/lib/firebase-admin"
import type { Review } from "@/types"

const COLLECTION = "reviews"

function docToReview(id: string, data: FirebaseFirestore.DocumentData): Review {
  const toIso = (v: unknown): string | null => {
    if (!v) return null
    if (typeof v === "string") return v
    if (typeof (v as FirebaseFirestore.Timestamp).toDate === "function") {
      return (v as FirebaseFirestore.Timestamp).toDate().toISOString()
    }
    return null
  }

  return {
    id,
    bookingId: data["bookingId"] as string,
    userId: data["userId"] as string,
    technicianId: data["technicianId"] as string,
    rating: data["rating"] as number,
    comment: data["comment"] as string,
    technicianReply: (data["technicianReply"] as string | null) ?? null,
    technicianRepliedAt: toIso(data["technicianRepliedAt"]),
    createdAt: toIso(data["createdAt"]) ?? "",
    updatedAt: toIso(data["updatedAt"]),
  }
}

/** Get reviews for a technician (sorted by newest first) */
export async function getReviewsByTechnician(
  technicianId: string,
  limitCount = 20
): Promise<Review[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("technicianId", "==", technicianId)
    .orderBy("createdAt", "desc")
    .limit(limitCount)
    .get()
  return snap.docs.map((doc) => docToReview(doc.id, doc.data()))
}

/** Get a review for a specific booking (to check if one already exists) */
export async function getReviewByBooking(bookingId: string): Promise<Review | null> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("bookingId", "==", bookingId)
    .limit(1)
    .get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  if (!doc) return null
  return docToReview(doc.id, doc.data())
}

/** Get reviews left by a user */
export async function getReviewsByUser(userId: string): Promise<Review[]> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get()
  return snap.docs.map((doc) => docToReview(doc.id, doc.data()))
}

export interface CreateReviewInput {
  bookingId: string
  userId: string
  technicianId: string
  rating: number
  comment: string
}

/** Create a review and update technician rating atomically */
export async function createReview(input: CreateReviewInput): Promise<Review> {
  const now = new Date().toISOString()
  const reviewRef = adminDb.collection(COLLECTION).doc()
  const techRef = adminDb.collection("technicians").doc(input.technicianId)

  const data: Omit<Review, "id"> = {
    bookingId: input.bookingId,
    userId: input.userId,
    technicianId: input.technicianId,
    rating: input.rating,
    comment: input.comment,
    technicianReply: null,
    technicianRepliedAt: null,
    createdAt: now,
    updatedAt: null,
  }

  await adminDb.runTransaction(async (tx) => {
    const techDoc = await tx.get(techRef)
    if (!techDoc.exists) throw new Error("Technician not found")
    const techData = techDoc.data()!
    const oldRating = (techData["rating"] as number) ?? 0
    const oldCount = (techData["reviewCount"] as number) ?? 0
    const newCount = oldCount + 1
    const newRating = parseFloat(((oldRating * oldCount + input.rating) / newCount).toFixed(2))
    tx.set(reviewRef, data)
    tx.update(techRef, {
      rating: newRating,
      reviewCount: newCount,
      updatedAt: now,
    })
  })

  return { id: reviewRef.id, ...data }
}

/** Add or update a technician's reply to a review */
export async function setTechnicianReply(reviewId: string, reply: string): Promise<void> {
  const now = new Date().toISOString()
  await adminDb.collection(COLLECTION).doc(reviewId).update({
    technicianReply: reply,
    technicianRepliedAt: now,
    updatedAt: now,
  })
}
