import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  cookieDelete: vi.fn(),
}))

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}))

vi.mock("@/lib/session", () => ({
  SESSION_COOKIE_NAME: "__session",
}))

import { POST } from "@/app/api/auth/signout/route"

function createPostRequest() {
  return new NextRequest("http://localhost:3000/api/auth/signout", {
    method: "POST",
    headers: {
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/auth/signout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cookies.mockResolvedValue({
      delete: mocks.cookieDelete,
    })
  })

  it("clears the auth cookies", async () => {
    const response = await POST(createPostRequest())
    const json = (await response.json()) as { success: boolean; data: { message: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.message).toBe("Sesión cerrada")
    expect(mocks.cookieDelete).toHaveBeenNthCalledWith(1, "__session")
    expect(mocks.cookieDelete).toHaveBeenNthCalledWith(2, "__role")
  })

  it("rejects signout requests without an origin header on non-loopback hosts", async () => {
    const response = await POST(
      new NextRequest("https://app.scooterbooster.test/api/auth/signout", {
        method: "POST",
      })
    )
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toContain("bloqueada por seguridad")
  })

  it("allows missing origin headers on loopback hosts for local e2e flows", async () => {
    const response = await POST(
      new NextRequest("http://127.0.0.1:3000/api/auth/signout", {
        method: "POST",
      })
    )
    const json = (await response.json()) as { success: boolean; data: { message: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.message).toContain("cerrada")
  })
})
