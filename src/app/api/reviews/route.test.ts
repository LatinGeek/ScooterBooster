import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getReviewsByTechnician: vi.fn(),
  getBookingById: vi.fn(),
  updateBookingStatus: vi.fn(),
  getReviewByBooking: vi.fn(),
  createReview: vi.fn(),
  loggerInfo: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/reviews", () => ({
  getReviewsByTechnician: mocks.getReviewsByTechnician,
  getReviewByBooking: mocks.getReviewByBooking,
  createReview: mocks.createReview,
}))

vi.mock("@/lib/db/bookings", () => ({
  getBookingById: mocks.getBookingById,
  updateBookingStatus: mocks.updateBookingStatus,
}))

vi.mock("@/lib/logger", () => ({
  default: {
    info: mocks.loggerInfo,
  },
}))

import { GET, POST } from "@/app/api/reviews/route"

function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/reviews", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires technicianId on GET", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/reviews"))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("technicianId")
  })

  it("returns reviews for the requested technician", async () => {
    mocks.getReviewsByTechnician.mockResolvedValue([{ id: "review-1", rating: 5 }])

    const response = await GET(
      new NextRequest("http://localhost:3000/api/reviews?technicianId=tech-1"),
    )
    const json = (await response.json()) as { success: boolean; data: Array<{ id: string }> }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual([{ id: "review-1", rating: 5 }])
    expect(mocks.getReviewsByTechnician).toHaveBeenCalledWith("tech-1")
  })

  it("requires authentication for POST", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await POST(
      createPostRequest({
        bookingId: "booking-1",
        technicianId: "tech-1",
        rating: 5,
        comment: "Excelente servicio, muy recomendable.",
      }),
    )
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toContain("iniciar sesión")
  })

  it("blocks reviews for bookings owned by another user", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-2",
      technicianId: "tech-1",
      status: "completed",
      paymentStatus: "paid",
      scheduledDate: "2026-05-10T10:00:00.000Z",
    })

    const response = await POST(
      createPostRequest({
        bookingId: "booking-1",
        technicianId: "tech-1",
        rating: 5,
        comment: "Excelente servicio, muy recomendable.",
      }),
    )
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toContain("permisos")
  })

  it("blocks duplicate reviews per booking", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      technicianId: "tech-1",
      status: "completed",
      paymentStatus: "paid",
      scheduledDate: "2026-05-10T10:00:00.000Z",
    })
    mocks.getReviewByBooking.mockResolvedValue({ id: "review-1" })

    const response = await POST(
      createPostRequest({
        bookingId: "booking-1",
        technicianId: "tech-1",
        rating: 5,
        comment: "Excelente servicio, muy recomendable.",
      }),
    )
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(409)
    expect(json.success).toBe(false)
    expect(json.error).toContain("Ya existe")
  })

  it("creates a review for a completed matching booking", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      technicianId: "tech-1",
      status: "completed",
      paymentStatus: "paid",
      scheduledDate: "2026-05-10T10:00:00.000Z",
    })
    mocks.getReviewByBooking.mockResolvedValue(null)
    mocks.createReview.mockResolvedValue({
      id: "review-1",
      bookingId: "booking-1",
      technicianId: "tech-1",
      rating: 5,
      comment: "Excelente servicio, muy recomendable.",
    })

    const response = await POST(
      createPostRequest({
        bookingId: "booking-1",
        technicianId: "tech-1",
        rating: 5,
        comment: "Excelente servicio, muy recomendable.",
      }),
    )
    const json = (await response.json()) as {
      success: boolean
      data: { review: { id: string } }
    }

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.review.id).toBe("review-1")
    expect(mocks.createReview).toHaveBeenCalledWith({
      bookingId: "booking-1",
      userId: "user-1",
      technicianId: "tech-1",
      rating: 5,
      comment: "Excelente servicio, muy recomendable.",
    })
    expect(mocks.updateBookingStatus).not.toHaveBeenCalled()
    expect(mocks.loggerInfo).toHaveBeenCalled()
  })

  it("marks an overdue paid booking as completed before creating the review", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      technicianId: "tech-1",
      status: "confirmed",
      paymentStatus: "paid",
      scheduledDate: "2026-05-08T10:00:00.000Z",
    })
    mocks.getReviewByBooking.mockResolvedValue(null)
    mocks.createReview.mockResolvedValue({
      id: "review-3",
      bookingId: "booking-1",
      technicianId: "tech-1",
      rating: 5,
      comment: "Excelente servicio, muy recomendable.",
    })

    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-09T10:00:01.000Z"))

    const response = await POST(
      createPostRequest({
        bookingId: "booking-1",
        technicianId: "tech-1",
        rating: 5,
        comment: "Excelente servicio, muy recomendable.",
      }),
    )

    expect(response.status).toBe(201)
    expect(mocks.updateBookingStatus).toHaveBeenCalledWith("booking-1", "completed")

    vi.useRealTimers()
  })

  it("sanitizes html from review comments before storing them", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      technicianId: "tech-1",
      status: "completed",
      paymentStatus: "paid",
      scheduledDate: "2026-05-10T10:00:00.000Z",
    })
    mocks.getReviewByBooking.mockResolvedValue(null)
    mocks.createReview.mockResolvedValue({
      id: "review-2",
      bookingId: "booking-1",
      technicianId: "tech-1",
      rating: 5,
      comment: "Excelente servicio.",
    })

    const response = await POST(
      createPostRequest({
        bookingId: "booking-1",
        technicianId: "tech-1",
        rating: 5,
        comment: "<script>alert('x')</script><b>Excelente servicio.</b>",
      }),
    )

    expect(response.status).toBe(201)
    expect(mocks.createReview).toHaveBeenCalledWith({
      bookingId: "booking-1",
      userId: "user-1",
      technicianId: "tech-1",
      rating: 5,
      comment: "Excelente servicio.",
    })
  })
})
