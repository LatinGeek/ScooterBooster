import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  searchPlatform: vi.fn(),
}))

vi.mock("@/lib/search", () => ({
  searchPlatform: mocks.searchPlatform,
}))

import { GET } from "@/app/api/search/route"

describe("/api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns empty groups for queries shorter than two characters", async () => {
    const request = new NextRequest("http://localhost:3000/api/search?q=x")

    const response = await GET(request)
    const json = (await response.json()) as {
      success: boolean
      data: { scooters: unknown[]; services: unknown[]; technicians: unknown[] }
    }

    expect(response.status).toBe(200)
    expect(json).toEqual({
      success: true,
      data: { scooters: [], services: [], technicians: [] },
    })
    expect(mocks.searchPlatform).not.toHaveBeenCalled()
  })

  it("rejects invalid limits", async () => {
    const request = new NextRequest("http://localhost:3000/api/search?q=xiaomi&limit=20")

    const response = await GET(request)
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("no puede superar 12 resultados")
  })

  it("returns grouped platform results for a valid query", async () => {
    mocks.searchPlatform.mockResolvedValue({
      scooters: [{ id: "model-1" }],
      services: [{ id: "service-1" }],
      technicians: [{ id: "tech-1" }],
    })

    const request = new NextRequest("http://localhost:3000/api/search?q=xiaomi&limit=4")

    const response = await GET(request)
    const json = (await response.json()) as {
      success: boolean
      data: { scooters: Array<{ id: string }>; services: Array<{ id: string }>; technicians: Array<{ id: string }> }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.technicians[0]?.id).toBe("tech-1")
    expect(mocks.searchPlatform).toHaveBeenCalledWith("xiaomi", 4)
  })
})
