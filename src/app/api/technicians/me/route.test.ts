import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getTechnicianByUserId: vi.fn(),
  updateTechnicianProfile: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianByUserId: mocks.getTechnicianByUserId,
  updateTechnicianProfile: mocks.updateTechnicianProfile,
}))

import { GET, PATCH } from "@/app/api/technicians/me/route"

function createPatchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/technicians/me", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/technicians/me", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the authenticated technician profile", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-user-1", role: "technician" })
    mocks.getTechnicianByUserId.mockResolvedValue({
      id: "tech-1",
      displayName: "Carlos Rodríguez",
    })

    const response = await GET()
    const json = (await response.json()) as { success: boolean; data: { id: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("tech-1")
  })

  it("rejects unauthenticated requests", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await GET()
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toContain("iniciar sesión")
  })

  it("blocks non-technician users from reading the technician profile", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })

    const response = await GET()
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toContain("permisos")
  })

  it("validates PATCH payloads before writing profile changes", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-user-1", role: "technician" })
    mocks.getTechnicianByUserId.mockResolvedValue({ id: "tech-1" })

    const response = await PATCH(
      createPatchRequest({
        whatsappNumber: "+59899111001",
      })
    )
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("598XXXXXXXX")
    expect(mocks.updateTechnicianProfile).not.toHaveBeenCalled()
  })

  it("updates the profile for technicians and returns the saved version", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-user-1", role: "technician" })
    mocks.getTechnicianByUserId.mockResolvedValue({ id: "tech-1" })
    mocks.updateTechnicianProfile.mockResolvedValue({
      id: "tech-1",
      displayName: "Carlos Tech",
      services: ["firmware"],
    })

    const payload = {
      displayName: "Carlos Tech",
      whatsappNumber: "59899111001",
      services: ["firmware"],
    }

    const response = await PATCH(createPatchRequest(payload))
    const json = (await response.json()) as {
      success: boolean
      data: { id: string; displayName: string }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.displayName).toBe("Carlos Tech")
    expect(mocks.updateTechnicianProfile).toHaveBeenCalledWith("tech-1", payload)
  })
})


