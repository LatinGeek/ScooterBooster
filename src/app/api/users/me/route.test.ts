import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const doc = {
    get: vi.fn(),
    update: vi.fn(),
  }

  return {
    getSession: vi.fn(),
    collection: vi.fn(() => ({
      doc: vi.fn(() => doc),
    })),
    doc,
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

import { DELETE, GET, PATCH } from "@/app/api/users/me/route"

function createPatchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  })
}

describe("/api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when no user session exists", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await GET()
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toBe("No autenticado")
  })

  it("returns the current user profile", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.doc.get.mockResolvedValue({
      exists: true,
      data: () => ({
        displayName: "Germán",
        phone: "+59899111000",
      }),
    })

    const response = await GET()
    const json = (await response.json()) as {
      success: boolean
      data: { uid: string; displayName: string }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual({
      uid: "user-1",
      displayName: "Germán",
      phone: "+59899111000",
    })
  })

  it("validates PATCH payloads before updating", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })

    const response = await PATCH(
      createPatchRequest({
        phone: "099111000",
      })
    )
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("+598")
    expect(mocks.doc.update).not.toHaveBeenCalled()
  })

  it("updates allowed profile fields and returns the saved user", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.doc.get.mockResolvedValue({
      exists: true,
      data: () => ({
        displayName: "Germán Actualizado",
        phone: null,
        whatsappConsent: true,
      }),
    })

    const response = await PATCH(
      createPatchRequest({
        displayName: "Germán Actualizado",
        phone: null,
        whatsappConsent: true,
      })
    )
    const json = (await response.json()) as {
      success: boolean
      data: { uid: string; displayName: string; whatsappConsent: boolean }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mocks.doc.update).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "Germán Actualizado",
        phone: null,
        whatsappConsent: true,
        updatedAt: expect.any(String),
      })
    )
    expect(json.data.uid).toBe("user-1")
    expect(json.data.displayName).toBe("Germán Actualizado")
  })

  it("soft deletes the current account", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })

    const response = await DELETE()
    const json = (await response.json()) as { success: boolean; data: { message: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.message).toBe("Cuenta eliminada")
    expect(mocks.doc.update).toHaveBeenCalledWith(
      expect.objectContaining({
        deletedAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    )
  })
})
