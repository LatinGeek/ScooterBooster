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

describe("/api/auth/signout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.cookies.mockResolvedValue({
      delete: mocks.cookieDelete,
    })
  })

  it("clears the auth cookies", async () => {
    const response = await POST()
    const json = (await response.json()) as { success: boolean; data: { message: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.message).toBe("Sesión cerrada")
    expect(mocks.cookieDelete).toHaveBeenNthCalledWith(1, "__session")
    expect(mocks.cookieDelete).toHaveBeenNthCalledWith(2, "__role")
  })
})
