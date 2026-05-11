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

export async function ensureUserProfile(
  uid: string,
  profile: Pick<User, "displayName" | "email" | "photoURL" | "role"> & {
    phone?: string | null
  }
): Promise<User> {
  const userRef = adminDb.collection("users").doc(uid)
  const snap = await userRef.get()

  if (!snap.exists) {
    const now = new Date().toISOString()
    const nextUser: Omit<User, "uid"> = {
      displayName: profile.displayName,
      email: profile.email,
      photoURL: profile.photoURL,
      role: profile.role,
      phone: profile.phone ?? null,
      whatsappConsent: false,
      createdAt: now,
      updatedAt: now,
    }

    await userRef.set(nextUser)
    return {
      uid,
      ...nextUser,
    }
  }

  const currentUser = docToUser(snap.id, snap.data()!)
  if (profile.phone && !currentUser.phone) {
    const updatedAt = new Date().toISOString()
    await userRef.update({
      phone: profile.phone,
      updatedAt,
    })

    const updatedSnap = await userRef.get()
    return docToUser(updatedSnap.id, updatedSnap.data()!)
  }

  return currentUser
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

export async function getLatestUsers(
  limit = 100,
  options?: { startAfter?: string },
): Promise<{ users: User[]; hasMore: boolean; lastId: string | undefined }> {
  let query = adminDb.collection("users").orderBy("createdAt", "desc").limit(limit + 1)

  if (options?.startAfter) {
    const lastDoc = await adminDb.collection("users").doc(options.startAfter).get()
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc)
    }
  }

  const snapshot = await query.get()
  const docs = snapshot.docs.slice(0, limit)

  return {
    users: docs.map((doc) => docToUser(doc.id, doc.data())),
    hasMore: snapshot.docs.length > limit,
    lastId: docs.at(-1)?.id,
  }
}

export async function updateUserRole(uid: string, role: User["role"]): Promise<User> {
  const updatedAt = new Date().toISOString()
  await adminDb.collection("users").doc(uid).update({
    role,
    updatedAt,
  })

  const snap = await adminDb.collection("users").doc(uid).get()
  return docToUser(snap.id, snap.data()!)
}

export async function adminSoftDeleteUser(uid: string): Promise<User> {
  const now = new Date()
  const scheduled = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  await adminDb.collection("users").doc(uid).update({
    deletedAt: now.toISOString(),
    scheduledDeletionAt: scheduled.toISOString(),
    updatedAt: now.toISOString(),
    phone: null,
    whatsappConsent: false,
  })

  const snap = await adminDb.collection("users").doc(uid).get()
  return docToUser(snap.id, snap.data()!)
}

export async function adminRestoreUser(uid: string): Promise<User> {
  const updatedAt = new Date().toISOString()
  await adminDb.collection("users").doc(uid).update({
    deletedAt: null,
    scheduledDeletionAt: null,
    updatedAt,
  })

  const snap = await adminDb.collection("users").doc(uid).get()
  return docToUser(snap.id, snap.data()!)
}
