import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { NotificationsClient } from "./notifications-client"

export const dynamic = "force-dynamic"

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/notifications")
  if (session.role !== "user") redirect("/dashboard")

  return <NotificationsClient userId={session.uid} />
}
