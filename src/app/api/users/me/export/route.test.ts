import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const doc = {
    get: vi.fn(),
  }

  return {
    getSession: vi.fn(),
    collection: vi.fn(() => ({
      doc: vi.fn(() => doc),
    })),
    doc,
    getBookingsByUser: vi.fn(),
    getReviewsByUser: vi.fn(),
    getTechnicianByUserId: vi.fn(),
  }
})

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: mocks.collection,
  },
}))

vi.mock("@/lib/db/bookings", () => ({
  getBookingsByUser: mocks.getBookingsByUser,
}))

vi.mock("@/lib/db/reviews", () => ({
  getReviewsByUser: mocks.getReviewsByUser,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianByUserId: mocks.getTechnicianByUserId,
}))

import { GET } from "@/app/api/users/me/export/route"

describe("/api/users/me/export", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires an authenticated session", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await GET()
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toBe("No autenticado")
  })

  it("returns the user's export bundle", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.doc.get.mockResolvedValue({
      exists: true,
      data: () => ({
        displayName: "German",
        email: "german@example.com",
        role: "user",
      }),
    })
    mocks.getBookingsByUser.mockResolvedValue([{ id: "booking-1" }])
    mocks.getReviewsByUser.mockResolvedValue([{ id: "review-1" }])
    mocks.getTechnicianByUserId.mockResolvedValue(null)

    const response = await GET()
    const json = (await response.json()) as {
      success: boolean
      data: {
        exportedAt: string
        user: { uid: string; displayName: string }
        bookings: Array<{ id: string }>
        reviews: Array<{ id: string }>
        technicianProfile: null
      }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.user.uid).toBe("user-1")
    expect(json.data.user.displayName).toBe("German")
    expect(json.data.bookings).toEqual([{ id: "booking-1" }])
    expect(json.data.reviews).toEqual([{ id: "review-1" }])
    expect(json.data.technicianProfile).toBeNull()
    expect(json.data.exportedAt).toEqual(expect.any(String))
    expect(mocks.getBookingsByUser).toHaveBeenCalledWith("user-1")
    expect(mocks.getReviewsByUser).toHaveBeenCalledWith("user-1")
    expect(mocks.getTechnicianByUserId).toHaveBeenCalledWith("user-1")
  })
})
