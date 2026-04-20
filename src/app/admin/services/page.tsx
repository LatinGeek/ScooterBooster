import { redirect } from "next/navigation"
import { getAllServices } from "@/lib/db/services"
import { getSession } from "@/lib/session"
import { AdminServicesClient } from "./services-client"

export const dynamic = "force-dynamic"

export default async function AdminServicesPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/services")
  if (session.role !== "admin") redirect("/")

  return <AdminServicesClient services={await getAllServices()} />
}
