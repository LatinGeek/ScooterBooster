import { redirect } from "next/navigation"
import { AdminUsersClient } from "./users-client"
import { getLatestUsers } from "@/lib/db/users"
import { getSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/admin/users")
  if (session.role !== "admin") redirect("/")

  const users = await getLatestUsers(150)
  return <AdminUsersClient users={users} currentAdminUid={session.uid} />
}
