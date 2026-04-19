import lazyLoad from "next/dynamic"
import { redirect } from "next/navigation"
import { Skeleton } from "@/components/ui/skeleton"
import { getTechnicianByUserId } from "@/lib/db/technicians"
import { getSession } from "@/lib/session"

const TechnicianProfileClient = lazyLoad(
  () => import("./profile-client").then((m) => m.TechnicianProfileClient),
  { loading: () => <Skeleton className="h-96 w-full rounded-xl" /> },
)

export const dynamic = "force-dynamic"

export default async function TechnicianProfilePage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician/profile")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")

  const tech = await getTechnicianByUserId(session.uid)
  if (!tech) redirect("/onboarding")

  return <TechnicianProfileClient tech={tech} />
}
