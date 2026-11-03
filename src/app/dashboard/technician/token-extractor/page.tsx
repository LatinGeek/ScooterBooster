import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { TokenExtractorPanel } from "@/components/token-extractor/token-extractor-panel"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"
export const metadata: Metadata = {
  title: "Token Extractor",
  robots: { index: false, follow: false },
}

export default async function TechnicianTokenExtractorPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/technician/token-extractor")
  if (session.role !== "technician" && session.role !== "admin") redirect("/dashboard")
  return <TokenExtractorPanel />
}
