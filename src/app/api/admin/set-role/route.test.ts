import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  setCustomUserClaims: vi.fn(),
  updateUserRole: vi.fn(),
  addAuditLogEntry: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    setCustomUserClaims: mocks.setCustomUserClaims,
  },
}))

vi.mock("@/lib/db/users", () => ({
  updateUserRole: mocks.updateUserRole,
}))

vi.mock("@/lib/db/audit-log", () => ({
  addAuditLogEntry: mocks.addAuditLogEntry,
}))

import { POST } from "@/app/api/admin/set-role/route"

function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/set-role", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/admin/set-role", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires authentication", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await POST(createPostRequest({ uid: "user-1", role: "admin" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toBe("No autenticado")
  })

  it("blocks non-admin callers", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-1", role: "technician" })

    const response = await POST(createPostRequest({ uid: "user-1", role: "admin" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toBe("Acceso denegado")
  })

  it("validates the request body", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })

    const response = await POST(createPostRequest({ uid: "", role: "godmode" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toBe("Datos inválidos")
    expect(mocks.setCustomUserClaims).not.toHaveBeenCalled()
  })

  it("assigns the requested role", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })

    const response = await POST(createPostRequest({ uid: "user-1", role: "technician" }))
    const json = (await response.json()) as { success: boolean; data: { message: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.message).toContain("technician")
    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith("user-1", { role: "technician" })
    expect(mocks.updateUserRole).toHaveBeenCalledWith("user-1", "technician")
    expect(mocks.addAuditLogEntry).toHaveBeenCalled()
  })

  it("prevents an admin from removing their own admin role", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })

    const response = await POST(createPostRequest({ uid: "admin-1", role: "user" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("No podés quitarte")
    expect(mocks.setCustomUserClaims).not.toHaveBeenCalled()
  })
})


