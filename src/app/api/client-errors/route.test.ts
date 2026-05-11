import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  warn: vi.fn(),
}))

vi.mock("@/lib/logger", () => ({
  default: {
    warn: mocks.warn,
  },
}))

vi.mock("@/lib/ratelimit", () => ({
  enforceIpRateLimit: vi.fn(),
}))

import { POST } from "@/app/api/client-errors/route"

function createRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/client-errors", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/client-errors", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("logs client error reports", async () => {
    const response = await POST(
      createRequest({
        scope: "login",
        code: "auth/profile-sync-failed",
        stage: "profile_sync",
        message: "Failed to sync user profile after Google sign-in.",
      })
    )

    const json = (await response.json()) as { success: boolean; data: { received: boolean } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.received).toBe(true)
    expect(mocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "login",
        code: "auth/profile-sync-failed",
        stage: "profile_sync",
      }),
      "Client error reported"
    )
  })
})
