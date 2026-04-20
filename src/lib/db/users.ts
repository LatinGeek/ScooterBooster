import { adminDb } from "@/lib/firebase-admin"
import type { User } from "@/types"

function toIso(value: unknown): string {
  if (typeof value === "string") return value
  if (value && typeof (value as FirebaseFirestore.Timestamp).toDate === "function") {
    return (value as FirebaseFirestore.Timestamp).toDate().toISOString()
  }
  return ""
}

function docToUser(id: string, data: FirebaseFirestore.DocumentData): User {
  return {
    uid: id,
    displayName: (data["displayName"] as string) ?? "",
    email: (data["email"] as string) ?? "",
    photoURL: (data["photoURL"] as string | null | undefined) ?? null,
    role: (data["role"] as User["role"]) ?? "user",
    phone: (data["phone"] as string | null | undefined) ?? null,
    whatsappConsent: (data["whatsappConsent"] as boolean | undefined) ?? false,
    deletedAt: (data["deletedAt"] as string | null | undefined) ?? null,
    scheduledDeletionAt: (data["scheduledDeletionAt"] as string | null | undefined) ?? null,
    createdAt: toIso(data["createdAt"]),
    updatedAt: toIso(data["updatedAt"]),
  }
}

export async function getUserById(uid: string): Promise<User | null> {
  const snap = await adminDb.collection("users").doc(uid).get()
  if (!snap.exists) return null
  return docToUser(snap.id, snap.data()!)
}

export async function getUsersByIds(userIds: string[]): Promise<Record<string, User>> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))]
  if (uniqueIds.length === 0) return {}

  const docs = await Promise.all(uniqueIds.map((uid) => adminDb.collection("users").doc(uid).get()))
  const users: Record<string, User> = {}

  for (const snap of docs) {
    if (snap.exists) {
      users[snap.id] = docToUser(snap.id, snap.data()!)
    }
  }

  return users
}

export async function getLatestUsers(limit = 100): Promise<User[]> {
  const snap = await adminDb.collection("users").orderBy("createdAt", "desc").limit(limit).get()
  return snap.docs.map((doc) => docToUser(doc.id, doc.data()))
}
