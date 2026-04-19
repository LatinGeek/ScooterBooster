import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  searchTechnicians: vi.fn(),
}))

vi.mock("@/lib/search", () => ({
  searchTechnicians: mocks.searchTechnicians,
}))

import { GET, POST } from "@/app/api/technicians/route"

describe("/api/technicians", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("validates technician search filters", async () => {
    const request = new NextRequest("http://localhost:3000/api/technicians?minRating=9")

    const response = await GET(request)
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("calificación mínima debe estar entre 0 y 5")
  })

  it("passes parsed filters to technician search", async () => {
    mocks.searchTechnicians.mockResolvedValue([{ id: "tech-1" }])

    const request = new NextRequest(
      "http://localhost:3000/api/technicians?q=firmware&service=service-1&service=service-2&brand=brand-xiaomi&location=Montevideo&minRating=4&minPrice=1000&maxPrice=2500&lat=-34.9&lng=-56.2"
    )

    const response = await GET(request)
    const json = (await response.json()) as {
      success: boolean
      data: Array<{ id: string }>
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual([{ id: "tech-1" }])
    expect(mocks.searchTechnicians).toHaveBeenCalledWith({
      query: "firmware",
      serviceIds: ["service-1", "service-2"],
      brandId: "brand-xiaomi",
      location: "Montevideo",
      minRating: 4,
      minPrice: 1000,
      maxPrice: 2500,
      latitude: -34.9,
      longitude: -56.2,
    })
  })

  it("returns the placeholder application response for valid POST payloads", async () => {
    const request = new NextRequest("http://localhost:3000/api/technicians", {
      method: "POST",
      body: JSON.stringify({ displayName: "Alan" }),
      headers: {
        "Content-Type": "application/json",
      },
    })

    const response = await POST(request)
    const json = (await response.json()) as {
      success: boolean
      data: { id: string }
    }

    expect(response.status).toBe(200)
    expect(json).toEqual({
      success: true,
      data: { id: "placeholder" },
    })
  })
})
