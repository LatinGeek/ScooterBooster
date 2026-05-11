import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createSessionCookie: vi.fn(),
  cookies: vi.fn(),
  cookieSet: vi.fn(),
  ensureUserProfile: vi.fn(),
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

vi.mock("@/lib/db/users", () => ({
  ensureUserProfile: mocks.ensureUserProfile,
}))

import { POST } from "@/app/api/auth/session/route"

function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/auth/session", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cookies.mockResolvedValue({
      set: mocks.cookieSet,
    })
    mocks.ensureUserProfile.mockResolvedValue(undefined)
  })

  it("validates the idToken payload", async () => {
    const response = await POST(createPostRequest({ idToken: "" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toBe("Token inválido")
    expect(mocks.createSessionCookie).not.toHaveBeenCalled()
  })

  it("rejects session creation without an origin header on non-loopback hosts", async () => {
    const response = await POST(
      new NextRequest("https://app.scooterbooster.test/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ idToken: "id-token-123" }),
        headers: {
          "Content-Type": "application/json",
        },
      })
    )
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toContain("bloqueada por seguridad")
  })

  it("allows missing origin headers on loopback hosts for local e2e flows", async () => {
    mocks.createSessionCookie.mockResolvedValue("session-cookie-value")
    mocks.verifyIdToken.mockResolvedValue({ uid: "user-1", role: "user" })

    const response = await POST(
      new NextRequest("http://127.0.0.1:3000/api/auth/session", {
        method: "POST",
        body: JSON.stringify({ idToken: "id-token-123" }),
        headers: {
          "Content-Type": "application/json",
        },
      })
    )
    const json = (await response.json()) as { success: boolean; data: { message: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.message).toContain("iniciada")
  })

  it("creates the session cookie and role cookie", async () => {
    mocks.createSessionCookie.mockResolvedValue("session-cookie-value")
    mocks.verifyIdToken.mockResolvedValue({
      uid: "user-1",
      role: "technician",
      name: "Tech User",
      email: "tech@example.com",
      picture: "https://example.com/photo.png",
    })

    const response = await POST(createPostRequest({ idToken: "id-token-123" }))
    const json = (await response.json()) as { success: boolean; data: { message: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.message).toBe("Sesión iniciada")
    expect(mocks.createSessionCookie).toHaveBeenCalledWith("id-token-123")
    expect(mocks.verifyIdToken).toHaveBeenCalledWith("id-token-123")
    expect(mocks.ensureUserProfile).toHaveBeenCalledWith("user-1", {
      displayName: "Tech User",
      email: "tech@example.com",
      photoURL: "https://example.com/photo.png",
      role: "technician",
    })
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
