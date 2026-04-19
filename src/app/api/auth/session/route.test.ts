import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createSessionCookie: vi.fn(),
  cookies: vi.fn(),
  cookieSet: vi.fn(),
  verifyIdToken: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}))

vi.mock("@/lib/session", () => ({
  SESSION_COOKIE_NAME: "__session",
  createSessionCookie: mocks.createSessionCookie,
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminAuth: {
    verifyIdToken: mocks.verifyIdToken,
  },
}))

import { POST } from "@/app/api/auth/session/route"

function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/auth/session", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  })
}

describe("/api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cookies.mockResolvedValue({
      set: mocks.cookieSet,
    })
  })

  it("validates the idToken payload", async () => {
    const response = await POST(createPostRequest({ idToken: "" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toBe("Token inválido")
    expect(mocks.createSessionCookie).not.toHaveBeenCalled()
  })

  it("creates the session cookie and role cookie", async () => {
    mocks.createSessionCookie.mockResolvedValue("session-cookie-value")
    mocks.verifyIdToken.mockResolvedValue({ role: "technician" })

    const response = await POST(createPostRequest({ idToken: "id-token-123" }))
    const json = (await response.json()) as { success: boolean; data: { message: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.message).toBe("Sesión iniciada")
    expect(mocks.createSessionCookie).toHaveBeenCalledWith("id-token-123")
    expect(mocks.verifyIdToken).toHaveBeenCalledWith("id-token-123")
    expect(mocks.cookieSet).toHaveBeenNthCalledWith(
      1,
      "__session",
      "session-cookie-value",
      expect.objectContaining({ httpOnly: true, path: "/" })
    )
    expect(mocks.cookieSet).toHaveBeenNthCalledWith(
      2,
      "__role",
      "technician",
      expect.objectContaining({ httpOnly: false, path: "/" })
    )
  })
})
