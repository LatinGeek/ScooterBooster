import { redirect } from "next/navigation"
import { getAllBrands } from "@/lib/db/brands"
import { getAllServices } from "@/lib/db/services"
import { getAllModels } from "@/lib/db/models"
import { getSession } from "@/lib/session"
import { getAllTechnicians } from "@/lib/db/technicians"
import lazyLoad from "next/dynamic"
import { Skeleton } from "@/components/ui/skeleton"

const AdminTechniciansClient = lazyLoad(
  () => import("./technicians-client").then((m) => m.AdminTechniciansClient),
  { loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
)

export const dynamic = "force-dynamic"

export default async function AdminTechniciansPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/technicians")
  if (session.role !== "admin") redirect("/")

  const [technicians, services, models, brands] = await Promise.all([
    getAllTechnicians(),
    getAllServices(),
    getAllModels(),
    getAllBrands(),
  ])
  return <AdminTechniciansClient technicians={technicians} services={services} models={models} brands={brands} />
}
