import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getConfigDocMock = vi.fn()

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: getConfigDocMock,
      })),
    })),
  },
}))

import { GET } from "@/app/api/health/route"

describe("/api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns ok when Firestore is reachable", async () => {
    getConfigDocMock.mockResolvedValue({ exists: true })

    const request = new NextRequest("https://scooterbooster.uy/api/health")
    const response = await GET(request)
    const json = (await response.json()) as {
      success: boolean
      data: { ok: boolean; timestamp: string; route: string }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.ok).toBe(true)
    expect(json.data.route).toBe("/api/health")
    expect(Date.parse(json.data.timestamp)).not.toBeNaN()
  })
})
