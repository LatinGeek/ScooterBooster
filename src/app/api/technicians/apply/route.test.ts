import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getTechnicianByUserId: vi.fn(),
  createTechnicianApplication: vi.fn(),
  resubmitTechnicianApplication: vi.fn(),
  userGet: vi.fn(),
  auditAdd: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianByUserId: mocks.getTechnicianByUserId,
  createTechnicianApplication: mocks.createTechnicianApplication,
  resubmitTechnicianApplication: mocks.resubmitTechnicianApplication,
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === "users") {
        return {
          doc: vi.fn(() => ({
            get: mocks.userGet,
          })),
        }
      }

      if (name === "auditLog") {
        return {
          add: mocks.auditAdd,
        }
      }

      throw new Error(`Unexpected collection ${name}`)
    }),
  },
}))

import { POST } from "@/app/api/technicians/apply/route"

function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/technicians/apply", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/technicians/apply", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires an authenticated user session", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await POST(createPostRequest({}))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
  })

  it("blocks non-user roles", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-1", role: "technician" })

    const response = await POST(createPostRequest({}))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toContain("permisos")
  })

  it("validates the application payload", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })
    mocks.getTechnicianByUserId.mockResolvedValue(null)

    const response = await POST(
      createPostRequest({
        bio: "muy corto",
        services: [],
        supportedBrands: [],
        location: "",
        whatsappNumber: "123",
        basePrice: 100,
      })
    )
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error.length).toBeGreaterThan(0)
  })

  it("creates a pending technician application", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })
    mocks.getTechnicianByUserId.mockResolvedValue(null)
    mocks.userGet.mockResolvedValue({
      exists: true,
      data: () => ({
        displayName: "Alan Tecnico",
        phone: "+59899123456",
        photoURL: null,
      }),
    })
    mocks.createTechnicianApplication.mockResolvedValue({
      id: "user-1",
      isApproved: false,
      isActive: true,
      services: ["maintenance"],
      supportedBrands: ["brand-xiaomi"],
      location: "Pocitos, Montevideo",
    })

    const response = await POST(
      createPostRequest({
        bio: "Tecnico con experiencia en mantenimiento, firmware y diagnostico de scooters urbanos.",
        services: ["maintenance"],
        supportedBrands: ["brand-xiaomi"],
        location: "Pocitos, Montevideo",
        whatsappNumber: "59899123456",
        basePrice: 1800,
      })
    )
    const json = (await response.json()) as {
      success: boolean
      data: { id: string; isApproved: boolean; isActive: boolean }
    }

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data).toEqual(
      expect.objectContaining({
        id: "user-1",
        isApproved: false,
        isActive: true,
      }),
    )
    expect(mocks.createTechnicianApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "user-1",
        userId: "user-1",
        displayName: "Alan Tecnico",
        phone: "+59899123456",
        whatsappNumber: "59899123456",
        services: ["maintenance"],
      })
    )
    expect(mocks.auditAdd).toHaveBeenCalledTimes(1)
  })

  it("allows resubmitting an application after request-changes", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })
    mocks.getTechnicianByUserId.mockResolvedValue({
      id: "user-1",
      photoURL: "https://example.com/tech.webp",
      availability: { monday: { start: "09:00", end: "18:00", isAvailable: true } },
    })
    mocks.userGet.mockResolvedValue({
      exists: true,
      data: () => ({
        displayName: "Alan Tecnico",
        phone: "+59899123456",
        photoURL: null,
      }),
    })
    mocks.resubmitTechnicianApplication.mockResolvedValue({
      id: "user-1",
      isApproved: false,
      isActive: true,
      applicationStatus: "pending",
      services: ["maintenance"],
      supportedBrands: ["brand-xiaomi"],
      location: "Pocitos, Montevideo",
    })

    const response = await POST(
      createPostRequest({
        bio: "Tecnico con experiencia en mantenimiento, firmware y diagnostico de scooters urbanos.",
        services: ["maintenance"],
        supportedBrands: ["brand-xiaomi"],
        location: "Pocitos, Montevideo",
        whatsappNumber: "59899123456",
        basePrice: 1800,
      }),
    )
    const json = (await response.json()) as {
      success: boolean
      data: { id: string; applicationStatus: string }
    }

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.applicationStatus).toBe("pending")
    expect(mocks.resubmitTechnicianApplication).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        displayName: "Alan Tecnico",
        photoURL: "https://example.com/tech.webp",
        services: ["maintenance"],
      }),
    )
  })
})
