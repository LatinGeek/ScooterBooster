import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const doc = {
    get: vi.fn(),
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

import { GET } from "@/app/api/auth/me/route"

describe("/api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when no session is present", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await GET()
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toBe("No autenticado")
  })

  it("returns 404 when the user profile is missing", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.doc.get.mockResolvedValue({
      exists: false,
    })

    const response = await GET()
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(404)
    expect(json.success).toBe(false)
    expect(json.error).toBe("Usuario no encontrado")
  })

  it("returns the current authenticated user profile", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.doc.get.mockResolvedValue({
      exists: true,
      data: () => ({
        displayName: "Germán",
        role: "user",
      }),
    })

    const response = await GET()
    const json = (await response.json()) as {
      success: boolean
      data: { uid: string; displayName: string; role: string }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual({
      uid: "user-1",
      displayName: "Germán",
      role: "user",
    })
  })
})
