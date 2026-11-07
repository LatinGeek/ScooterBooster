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

export default async function AdminFirmwarePatcherPage() {
  if (!isFirmwarePatcherPageEnabled()) notFound()
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/firmware-patcher")
  // Both staff roles may use the tool; admins are routed here, technicians use their own dashboard.
  if (session.role !== "admin") redirect("/")
  return <FirmwarePatcherPanel role="admin" />
}
