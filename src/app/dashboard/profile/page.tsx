import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { getUserById } from "@/lib/db/users"
import { ProfileClient } from "./profile-client"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/profile")

  const user = await getUserById(session.uid)
  if (!user) redirect("/login")

  return <ProfileClient user={user} />
}
