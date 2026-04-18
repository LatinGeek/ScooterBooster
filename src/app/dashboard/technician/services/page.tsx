import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getActiveServices } from "@/lib/db/services"
import { getActiveBrands } from "@/lib/db/brands"
import { TechnicianServicesClient } from "./services-client"

export const dynamic = "force-dynamic"

export default async function TechnicianServicesPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician/services")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) redirect("/onboarding")

  const [allServices, allBrands] = await Promise.all([getActiveServices(), getActiveBrands()])

  return (
    <TechnicianServicesClient
      tech={tech}
      allServices={allServices}
      allBrands={allBrands}
    />
  )
}
