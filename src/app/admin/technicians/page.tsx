import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getAllTechnicians } from "@/lib/db/technicians"
import { AdminTechniciansClient } from "./technicians-client"

export const dynamic = "force-dynamic"

export default async function AdminTechniciansPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/technicians")
  if (session.role !== "admin") redirect("/")

  const technicians = await getAllTechnicians()
  return <AdminTechniciansClient technicians={technicians} />
}
