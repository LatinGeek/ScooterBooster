import lazyLoad from "next/dynamic"
import { redirect } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getSession } from "@/lib/session"

const AvailabilityClient = lazyLoad(
  () => import("./availability-client").then((m) => m.AvailabilityClient),
  { loading: () => <Skeleton className="h-64 w-full rounded-xl" /> },
)

export const dynamic = "force-dynamic"

export default async function TechnicianAvailabilityPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician/availability")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) redirect("/onboarding")

  return <AvailabilityClient tech={tech} />
}
