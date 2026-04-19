import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getTechnicianById: vi.fn(),
  setTechnicianApproval: vi.fn(),
  setCustomUserClaims: vi.fn(),
  loggerInfo: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianById: mocks.getTechnicianById,
  setTechnicianApproval: mocks.setTechnicianApproval,
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    setCustomUserClaims: mocks.setCustomUserClaims,
  },
}))

vi.mock("@/lib/logger", () => ({
  default: {
    info: mocks.loggerInfo,
  },
}))

// next/cache is not available in the test environment
vi.mock("next/cache", () => ({
  revalidateTag: mocks.revalidateTag,
}))

import { PATCH } from "@/app/api/admin/technicians/[id]/route"

function createPatchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/technicians/tech-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/admin/technicians/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires an authenticated admin", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await PATCH(createPatchRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "tech-1" }),
    })
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toContain("iniciar sesión")
  })

  it("blocks non-admin users", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "technician" })

    const response = await PATCH(createPatchRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "tech-1" }),
    })
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toContain("permisos")
  })

  it("validates the action payload", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getTechnicianById.mockResolvedValue({ id: "tech-1" })

    const response = await PATCH(createPatchRequest({ action: "maybe" }), {
      params: Promise.resolve({ id: "tech-1" }),
    })
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("Acción inválida")
    expect(mocks.setTechnicianApproval).not.toHaveBeenCalled()
  })

  it("approves a technician profile", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getTechnicianById.mockResolvedValue({ id: "tech-1", userId: "user-1" })

    const response = await PATCH(createPatchRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "tech-1" }),
    })
    const json = (await response.json()) as {
      success: boolean
      data: { id: string; isApproved: boolean }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual({ id: "tech-1", isApproved: true })
    expect(mocks.setTechnicianApproval).toHaveBeenCalledWith("tech-1", true)
    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith("user-1", { role: "technician" })
    expect(mocks.loggerInfo).toHaveBeenCalled()
  })
})

