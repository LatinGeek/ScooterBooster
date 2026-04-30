import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const doc = {
    get: vi.fn(),
    set: vi.fn(),
  }

  return {
    getSession: vi.fn(),
    collection: vi.fn(() => ({
      doc: vi.fn(() => doc),
    })),
    doc,
    loggerInfo: vi.fn(),
  }
})

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: mocks.collection,
  },
}))

vi.mock("@/lib/logger", () => ({
  default: {
    info: mocks.loggerInfo,
  },
}))

import { GET, PATCH } from "@/app/api/admin/settings/route"

function createPatchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/admin/settings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires admin auth on GET", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await GET()
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toContain("iniciar sesi")
  })

  it("falls back to the fixed fee when the Firestore doc does not exist", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.doc.get.mockResolvedValue({
      exists: false,
    })

    const response = await GET()
    const json = (await response.json()) as {
      success: boolean
      data: { serviceFeeAmount: number }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.serviceFeeAmount).toBe(100)
  })

  it("validates settings updates", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })

    const response = await PATCH(createPatchRequest({ serviceFeeAmount: -1 }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("no puede ser negativo")
    expect(mocks.doc.set).not.toHaveBeenCalled()
  })

  it("persists valid settings changes", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })

    const response = await PATCH(createPatchRequest({ serviceFeeAmount: 100 }))
    const json = (await response.json()) as {
      success: boolean
      data: { serviceFeeAmount: number; updatedAt: string }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.serviceFeeAmount).toBe(100)
    expect(mocks.doc.set).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceFeeAmount: 100,
        updatedAt: expect.any(String),
        updatedBy: "admin-1",
      }),
      { merge: true }
    )
    expect(mocks.loggerInfo).toHaveBeenCalled()
  })
})
