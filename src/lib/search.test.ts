import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/brands", () => ({
  getActiveBrands: vi.fn(),
}))

vi.mock("@/lib/db/models", () => ({
  getActiveModels: vi.fn(),
}))

vi.mock("@/lib/db/services", () => ({
  getActiveServices: vi.fn(),
}))

vi.mock("@/lib/db/technicians", () => ({
  getActiveTechnicians: vi.fn(),
}))

import { getDistanceToTechnician } from "@/lib/technician-location"
import type { Technician } from "@/types"

const technicianBase: Technician = {
  id: "tech-1",
  slug: "tech-1",
  userId: "user-1",
  displayName: "Tecnico Demo",
  bio: "Especialista",
  photoURL: "",
  phone: "+59899123456",
  whatsappNumber: "59899123456",
  location: "Pocitos, Montevideo",
  coordinates: null,
  services: ["maintenance"],
  supportedBrands: ["brand-xiaomi"],
  availability: {},
  pricing: {
    maintenance: { basePrice: 1200, currency: "UYU" },
  },
  rating: 4.7,
  reviewCount: 12,
  isApproved: true,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

describe("getDistanceToTechnician", () => {
  it("falls back to Uruguay location presets when coordinates are missing", () => {
    const distance = getDistanceToTechnician(technicianBase, -34.9167, -56.1497)

    expect(distance).not.toBeNull()
    expect(distance).toBeLessThan(0.1)
  })

  it("prefers explicit technician coordinates when present", () => {
    const distance = getDistanceToTechnician(
      {
        ...technicianBase,
        coordinates: { lat: -34.9055, lng: -56.1913 },
      },
      -34.9055,
      -56.1913
    )

    expect(distance).not.toBeNull()
    expect(distance).toBeLessThan(0.1)
  })
})
