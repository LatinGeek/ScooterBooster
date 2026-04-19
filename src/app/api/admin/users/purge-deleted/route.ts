/**
 * POST /api/admin/users/purge-deleted
 *
 * Hard-deletes user accounts whose 30-day grace period has expired.
 * Called by Vercel Cron (daily at 03:00 UTC) — see vercel.json.
 *
 * Auth: cron requests from Vercel carry the CRON_SECRET as a Bearer token.
 * Admin-role users can also trigger it manually for testing.
 */
import { NextRequest } from "next/server"
import { adminDb, adminAuth } from "@/lib/firebase-admin"
import { ok, fail, withErrorHandling } from "@/lib/api-response"
import { getSession } from "@/lib/session"
import logger from "@/lib/logger"

function isCronAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const auth = req.headers.get("authorization") ?? ""
  return auth === `Bearer ${cronSecret}`
}

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Allow Vercel Cron calls or logged-in admins
  const isCron = isCronAuthorized(req)
  if (!isCron) {
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return fail("No autorizado", 403)
    }
  }

  const now = new Date().toISOString()

  // Find all users whose scheduled deletion date has passed
  const snap = await adminDb
    .collection("users")
    .where("scheduledDeletionAt", "<=", now)
    .where("deletedAt", "!=", null)
    .get()

  if (snap.empty) {
    return ok({ purged: 0, message: "No hay cuentas para eliminar." })
  }

  let purged = 0
  const errors: string[] = []

  for (const doc of snap.docs) {
    const uid = doc.id
    try {
      // 1. Hard-delete all user-owned reviews
      const reviewsSnap = await adminDb.collection("reviews").where("userId", "==", uid).get()
      const reviewBatch = adminDb.batch()
      for (const r of reviewsSnap.docs) {
        reviewBatch.delete(r.ref)
      }
      await reviewBatch.commit()

      // 2. Anonymize bookings (keep for platform records, strip user identity)
      const bookingsSnap = await adminDb.collection("bookings").where("userId", "==", uid).get()
      const bookingBatch = adminDb.batch()
      for (const b of bookingsSnap.docs) {
        bookingBatch.update(b.ref, {
          userId: "deleted",
          userDisplayName: "Usuario eliminado",
          updatedAt: now,
        })
      }
      await bookingBatch.commit()

      // 3. Delete linked technician profile if any
      const techSnap = await adminDb
        .collection("technicians")
        .where("userId", "==", uid)
        .limit(1)
        .get()
      if (!techSnap.empty && techSnap.docs[0]) {
        await techSnap.docs[0].ref.delete()
      }

      // 4. Hard-delete the user Firestore doc
      await adminDb.collection("users").doc(uid).delete()

      // 5. Delete Firebase Auth account
      await adminAuth.deleteUser(uid)

      purged++
      logger.info({ uid }, "user.purged")
    } catch (err) {
      logger.error({ uid, err }, "user.purge_failed")
      errors.push(uid)
    }
  }

  return ok({
    purged,
    failed: errors.length,
    failedUids: errors,
    message: `${purged} cuenta(s) eliminada(s) definitivamente.`,
  })
})
