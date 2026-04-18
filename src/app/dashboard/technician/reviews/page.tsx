import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getReviewsByTechnician } from "@/lib/db/reviews"
import { TechnicianReviewsClient } from "./reviews-client"

export const dynamic = "force-dynamic"

export default async function TechnicianReviewsPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician/reviews")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) redirect("/onboarding")

  const reviews = await getReviewsByTechnician(tech.id, 50)

  return <TechnicianReviewsClient reviews={reviews} technicianId={tech.id} />
}
