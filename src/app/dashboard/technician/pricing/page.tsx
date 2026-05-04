import lazyLoad from "next/dynamic"
import { redirect } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { getActiveBrands } from "@/lib/db/brands"
import { getActiveModels } from "@/lib/db/models"
import { getActiveServices } from "@/lib/db/services"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getSession } from "@/lib/session"

const PricingClient = lazyLoad(
  () => import("./pricing-client").then((m) => m.PricingClient),
  { loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
)

export const dynamic = "force-dynamic"

export default async function TechnicianPricingPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician/pricing")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) redirect("/onboarding")

  const [services, models, brands] = await Promise.all([
    getActiveServices(),
    getActiveModels(),
    getActiveBrands(),
  ])

  return <PricingClient tech={tech} services={services} models={models} brands={brands} />
}
