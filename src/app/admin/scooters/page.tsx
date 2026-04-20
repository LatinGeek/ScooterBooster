import { redirect } from "next/navigation"
import { getAllBrands } from "@/lib/db/brands"
import { getAllModels } from "@/lib/db/models"
import { getAllServices } from "@/lib/db/services"
import { getSession } from "@/lib/session"
import { AdminScootersClient } from "./scooters-client"

export const dynamic = "force-dynamic"

export default async function AdminScootersPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/scooters")
  if (session.role !== "admin") redirect("/")

  const [brands, models, services] = await Promise.all([
    getAllBrands(),
    getAllModels(),
    getAllServices(),
  ])

  return <AdminScootersClient brands={brands} models={models} services={services} />
}
