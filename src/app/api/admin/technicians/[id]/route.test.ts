import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getTechnicianById: vi.fn(),
  setTechnicianApplicationStatus: vi.fn(),
  setTechnicianApproval: vi.fn(),
  updateTechnicianProfile: vi.fn(),
  getUserById: vi.fn(),
  getServiceById: vi.fn(),
  addAuditLogEntry: vi.fn(),
  sendTechnicianApprovedEmail: vi.fn(),
  sendTechnicianRejectedEmail: vi.fn(),
  setCustomUserClaims: vi.fn(),
  loggerInfo: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianById: mocks.getTechnicianById,
  setTechnicianApplicationStatus: mocks.setTechnicianApplicationStatus,
  setTechnicianApproval: mocks.setTechnicianApproval,
  updateTechnicianProfile: mocks.updateTechnicianProfile,
}))

vi.mock("@/lib/db/users", () => ({
  getUserById: mocks.getUserById,
}))

vi.mock("@/lib/db/services", () => ({
  getServiceById: mocks.getServiceById,
}))

vi.mock("@/lib/db/audit-log", () => ({
  addAuditLogEntry: mocks.addAuditLogEntry,
}))

vi.mock("@/lib/notification-emails", () => ({
  sendTechnicianApprovedEmail: mocks.sendTechnicianApprovedEmail,
  sendTechnicianRejectedEmail: mocks.sendTechnicianRejectedEmail,
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
    mocks.getUserById.mockResolvedValue({ uid: "user-1", email: "tech@example.com" })
    mocks.getServiceById.mockResolvedValue({ id: "service-1", name: "Mantenimiento" })
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
    mocks.getTechnicianById.mockResolvedValue({ id: "tech-1", userId: "user-1", displayName: "Carlos", services: ["service-1"] })

    const response = await PATCH(createPatchRequest({ action: "approve" }), {
      params: Promise.resolve({ id: "tech-1" }),
    })
    const json = (await response.json()) as {
      success: boolean
      data: { id: string; isApproved: boolean }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual(
      expect.objectContaining({ id: "tech-1", isApproved: true, applicationStatus: "approved" }),
    )
    expect(mocks.setTechnicianApproval).toHaveBeenCalledWith("tech-1", true)
    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith("user-1", { role: "technician" })
    expect(mocks.loggerInfo).toHaveBeenCalled()
  })

  it("can request changes with a moderation reason", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getTechnicianById.mockResolvedValue({
      id: "tech-1",
      userId: "user-1",
      displayName: "Carlos",
      services: ["service-1"],
    })

    const response = await PATCH(
      createPatchRequest({
        action: "request_changes",
        reason: "Necesitamos una foto mas clara y una bio mas especifica.",
      }),
      {
        params: Promise.resolve({ id: "tech-1" }),
      },
    )
    const json = (await response.json()) as {
      success: boolean
      data: { applicationStatus: string; moderationReason: string }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.applicationStatus).toBe("request_changes")
    expect(mocks.setTechnicianApplicationStatus).toHaveBeenCalledWith("tech-1", {
      status: "request_changes",
      reason: "Necesitamos una foto mas clara y una bio mas especifica.",
    })
    expect(mocks.setCustomUserClaims).toHaveBeenCalledWith("user-1", { role: "user" })
    expect(mocks.addAuditLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({ action: "technician_changes_requested" }),
    )
  })

  it("lets admins override technician profile fields", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getTechnicianById.mockResolvedValue({ id: "tech-1", userId: "user-1", displayName: "Carlos", services: ["service-1"] })
    mocks.updateTechnicianProfile.mockResolvedValue({
      id: "tech-1",
      displayName: "Carlos Centro",
      bio: "Perfil actualizado",
      photoURL: "https://example.com/tech.jpg",
      phone: "+59899111001",
      whatsappNumber: "59899111001",
      location: "Centro, Montevideo",
      services: ["service-1"],
      supportedBrands: ["brand-1"],
      availability: {},
      pricing: {},
      rating: 5,
      reviewCount: 12,
      isApproved: true,
      isActive: true,
      createdAt: "2026-04-01T00:00:00.000Z",
      updatedAt: "2026-04-21T00:00:00.000Z",
    })

    const payload = {
      action: "update",
      displayName: "Carlos Centro",
      bio: "<b>Perfil actualizado</b>",
      location: "Centro, Montevideo",
      phone: "+59899111001",
      whatsappNumber: "59899111001",
      services: ["service-1"],
      supportedBrands: ["brand-1"],
      isActive: true,
    }

    const response = await PATCH(createPatchRequest(payload), {
      params: Promise.resolve({ id: "tech-1" }),
    })
    const json = (await response.json()) as { success: boolean; data: { displayName: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.displayName).toBe("Carlos Centro")
    expect(mocks.updateTechnicianProfile).toHaveBeenCalledWith("tech-1", expect.objectContaining({
      displayName: "Carlos Centro",
      bio: "Perfil actualizado",
      location: "Centro, Montevideo",
    }))
    expect(mocks.addAuditLogEntry).toHaveBeenCalledWith(expect.objectContaining({
      action: "technician_profile_overridden",
      targetId: "tech-1",
    }))
  })
})
