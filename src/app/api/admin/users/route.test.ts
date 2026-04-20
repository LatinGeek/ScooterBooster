import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getUserById: vi.fn(),
  adminSoftDeleteUser: vi.fn(),
  adminRestoreUser: vi.fn(),
  updateUser: vi.fn(),
  addAuditLogEntry: vi.fn(),
}))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/db/users", () => ({
  getUserById: mocks.getUserById,
  adminSoftDeleteUser: mocks.adminSoftDeleteUser,
  adminRestoreUser: mocks.adminRestoreUser,
}))
vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    updateUser: mocks.updateUser,
  },
}))
vi.mock("@/lib/db/audit-log", () => ({ addAuditLogEntry: mocks.addAuditLogEntry }))

import { PATCH } from "@/app/api/admin/users/route"

function createRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/users", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("soft-deletes a non-admin user", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getUserById.mockResolvedValue({ uid: "user-1", email: "user@example.com", role: "user" })
    mocks.adminSoftDeleteUser.mockResolvedValue({ uid: "user-1", deletedAt: "2026-04-20T00:00:00.000Z" })

    const response = await PATCH(createRequest({ uid: "user-1", action: "soft_delete" }))
    const json = (await response.json()) as { data: { uid: string } }

    expect(response.status).toBe(200)
    expect(json.data.uid).toBe("user-1")
    expect(mocks.updateUser).toHaveBeenCalledWith("user-1", { disabled: true })
    expect(mocks.addAuditLogEntry).toHaveBeenCalled()
  })

  it("restores a deleted user", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getUserById.mockResolvedValue({ uid: "user-1", email: "user@example.com", role: "user" })
    mocks.adminRestoreUser.mockResolvedValue({ uid: "user-1", deletedAt: null })

    const response = await PATCH(createRequest({ uid: "user-1", action: "restore" }))
    const json = (await response.json()) as { data: { uid: string } }

    expect(response.status).toBe(200)
    expect(json.data.uid).toBe("user-1")
    expect(mocks.updateUser).toHaveBeenCalledWith("user-1", { disabled: false })
  })

  it("blocks deleting admin users from the panel", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getUserById.mockResolvedValue({ uid: "admin-2", email: "admin@example.com", role: "admin" })

    const response = await PATCH(createRequest({ uid: "admin-2", action: "soft_delete" }))
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(json.error).toContain("admins")
    expect(mocks.updateUser).not.toHaveBeenCalled()
  })
})
