import { adminDb } from "@/lib/firebase-admin"
import type { AuditLogEntry } from "@/types"

function toIso(value: unknown): string {
  if (typeof value === "string") return value
  if (value && typeof (value as FirebaseFirestore.Timestamp).toDate === "function") {
    return (value as FirebaseFirestore.Timestamp).toDate().toISOString()
  }
  return ""
}

function docToAuditLogEntry(id: string, data: FirebaseFirestore.DocumentData): AuditLogEntry {
  return {
    id,
    action: (data["action"] as string) ?? (data["type"] as string) ?? "unknown",
    actorUid: (data["actorUid"] as string | null | undefined) ?? null,
    targetType: (data["targetType"] as string) ?? "unknown",
    targetId:
      (data["targetId"] as string | null | undefined) ??
      (data["bookingId"] as string | null | undefined) ??
      (data["technicianId"] as string | null | undefined) ??
      null,
    metadata: (data["metadata"] as Record<string, unknown> | undefined) ?? {},
    createdAt: toIso(data["createdAt"]),
  }
}

export interface CreateAuditLogEntryInput {
  action: string
  actorUid?: string | null
  targetType: string
  targetId?: string | null
  metadata?: Record<string, unknown>
}

export async function addAuditLogEntry(input: CreateAuditLogEntryInput): Promise<AuditLogEntry> {
  const createdAt = new Date().toISOString()
  const ref = await adminDb.collection("auditLog").add({
    action: input.action,
    actorUid: input.actorUid ?? null,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {},
    createdAt,
  })

  return {
    id: ref.id,
    action: input.action,
    actorUid: input.actorUid ?? null,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {},
    createdAt,
  }
}

export async function getLatestAuditEntries(limit = 200): Promise<AuditLogEntry[]> {
  const snap = await adminDb.collection("auditLog").orderBy("createdAt", "desc").limit(limit).get()
  return snap.docs.map((doc) => docToAuditLogEntry(doc.id, doc.data()))
}
