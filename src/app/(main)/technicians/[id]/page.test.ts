import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getActiveBrands: vi.fn(),
  getReviewsByTechnician: vi.fn(),
  getServicesByIds: vi.fn(),
  getTechnicianByIdentifier: vi.fn(),
  getUsersByIds: vi.fn(),
  getDistanceToTechnician: vi.fn(),
  getTechnicianLocationPreset: vi.fn(),
  getPresetBySlug: vi.fn(),
}))

vi.mock("@/lib/db/brands", () => ({
  getActiveBrands: mocks.getActiveBrands,
}))

vi.mock("@/lib/db/reviews", () => ({
  getReviewsByTechnician: mocks.getReviewsByTechnician,
}))

vi.mock("@/lib/db/services", () => ({
  getServicesByIds: mocks.getServicesByIds,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianByIdentifier: mocks.getTechnicianByIdentifier,
}))

vi.mock("@/lib/db/users", () => ({
  getUsersByIds: mocks.getUsersByIds,
}))

vi.mock("@/lib/search", () => ({
  getDistanceToTechnician: mocks.getDistanceToTechnician,
  getTechnicianLocationPreset: mocks.getTechnicianLocationPreset,
}))

vi.mock("@/lib/uruguay-locations", () => ({
  getPresetBySlug: mocks.getPresetBySlug,
}))

import { generateMetadata } from "@/app/(main)/technicians/[id]/page"

describe("/technicians/[id] metadata", () => {
  it("uses the technician profile photo and share copy", async () => {
    mocks.getTechnicianByIdentifier.mockResolvedValue({
      id: "tech-1",
      displayName: "Jonathan Denis",
      location: "Montevideo",
      bio: "Especialista en reparaciones y firmware",
      photoURL: "https://example.com/profile.jpg",
    })

    const metadata = await generateMetadata({ params: Promise.resolve({ id: "tech-1" }) })

    expect(metadata.title).toBe("Jonathan Denis")
    expect(metadata.description).toBe(
      "Técnico en ScooterBooster\nAgendá tu servicio técnico\nEspecialista en reparaciones y firmware"
    )
    expect(metadata.openGraph).toMatchObject({
      title: "Jonathan Denis",
      description:
        "Técnico en ScooterBooster\nAgendá tu servicio técnico\nEspecialista en reparaciones y firmware",
      url: "https://scooterbooster.uy/technicians/tech-1",
      siteName: "ScooterBooster",
      type: "profile",
      images: [
        {
          url: "https://example.com/profile.jpg",
          alt: "Jonathan Denis",
        },
      ],
    })
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Jonathan Denis",
      description:
        "Técnico en ScooterBooster\nAgendá tu servicio técnico\nEspecialista en reparaciones y firmware",
      images: ["https://example.com/profile.jpg"],
    })
  })
})
