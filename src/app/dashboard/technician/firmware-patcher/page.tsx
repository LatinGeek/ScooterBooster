import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { FirmwarePatcherPanel } from "@/components/firmware-patcher/firmware-patcher-panel"
import { isFirmwarePatcherPageEnabled } from "@/components/firmware-patcher/flags"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Parcheador de firmware",
  robots: { index: false, follow: false },
}

export default async function TechnicianFirmwarePatcherPage() {
  if (!isFirmwarePatcherPageEnabled()) notFound()
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician/firmware-patcher")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")
  return <FirmwarePatcherPanel role={session.role === "admin" ? "admin" : "technician"} />
}
