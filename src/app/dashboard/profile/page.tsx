import { redirect } from "next/navigation"
import { getSession } from "@/lib/session"
import { adminDb } from "@/lib/firebase-admin"
import type { User } from "@/types"
import { ProfileClient } from "./profile-client"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect("/login?redirect=/dashboard/profile")

  const snap = await adminDb.collection("users").doc(session.uid).get()
  if (!snap.exists) redirect("/login")

  const user = { uid: session.uid, ...snap.data() } as User

  return <ProfileClient user={user} />
}
