import { adminDb } from "@/lib/firebase-admin"
import type { AppNotification, NotificationType } from "@/types"

interface CreateUserNotificationInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  href?: string | null
}

function docToNotification(
  id: string,
  data: FirebaseFirestore.DocumentData,
): AppNotification {
  return {
    id,
    type: data["type"] as NotificationType,
    title: data["title"] as string,
    body: data["body"] as string,
    href: (data["href"] as string | null | undefined) ?? null,
    readAt: (data["readAt"] as string | null | undefined) ?? null,
    createdAt:
      typeof data["createdAt"] === "string"
        ? data["createdAt"]
        : ((data["createdAt"] as FirebaseFirestore.Timestamp | undefined)
            ?.toDate()
            .toISOString() ?? ""),
  }
}

function notificationsCollection(userId: string) {
  return adminDb.collection("users").doc(userId).collection("notifications")
}

export async function createUserNotification(
  input: CreateUserNotificationInput,
): Promise<AppNotification> {
  const createdAt = new Date().toISOString()
  const ref = notificationsCollection(input.userId).doc()

  await ref.set({
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    readAt: null,
    createdAt,
  })

  const snap = await ref.get()
  return docToNotification(snap.id, snap.data() ?? {})
}
