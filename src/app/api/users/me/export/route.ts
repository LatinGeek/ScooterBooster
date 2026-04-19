import { getSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase-admin"
import { getBookingsByUser } from "@/lib/db/bookings"
import { getReviewsByUser } from "@/lib/db/reviews"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { ok, fail, withErrorHandling } from "@/lib/api-response"
import type { User } from "@/types"

export const GET = withErrorHandling(async () => {
  const session = await getSession()
  if (!session) return fail("No autenticado", 401)

  const userSnap = await adminDb.collection("users").doc(session.uid).get()
  if (!userSnap.exists) return fail("Usuario no encontrado", 404)

  const [bookings, reviews, technicianProfile] = await Promise.all([
    getBookingsByUser(session.uid),
    getReviewsByUser(session.uid),
    getTechnicianByUserId(session.uid),
  ])

  const user = { uid: session.uid, ...userSnap.data() } as User

  return ok({
    exportedAt: new Date().toISOString(),
    user,
    bookings,
    reviews,
    technicianProfile,
  })
})
