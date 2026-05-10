import { redirect } from "next/navigation"
import { AdminErrorBoundary } from "@/components/admin-error-boundary"
import { getAllServices } from "@/lib/db/services"
import { getSession } from "@/lib/session"
import { AdminServicesClient } from "./services-client"

export const dynamic = "force-dynamic"

export default async function AdminServicesPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/services")
  if (session.role !== "admin") redirect("/")

  return (
    <AdminErrorBoundary>
      <AdminServicesClient services={await getAllServices()} />
    </AdminErrorBoundary>
  )
}
