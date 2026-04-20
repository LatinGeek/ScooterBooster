import { redirect } from "next/navigation"
import { getTechnicianById } from "@/lib/db/technicians"
import { getAllReviews } from "@/lib/db/reviews"
import { getUsersByIds } from "@/lib/db/users"
import { getSession } from "@/lib/session"
import { AdminReviewsClient } from "./reviews-client"

export const dynamic = "force-dynamic"

export default async function AdminReviewsPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/reviews")
  if (session.role !== "admin") redirect("/")

  const reviews = await getAllReviews()
  const users = await getUsersByIds(reviews.map((review) => review.userId))
  const technicians = Object.fromEntries(
    await Promise.all(
      reviews.map(async (review) => {
        const technician = await getTechnicianById(review.technicianId)
        return [review.technicianId, technician]
      }),
    ),
  )

  return <AdminReviewsClient reviews={reviews} users={users} technicians={technicians} />
}
