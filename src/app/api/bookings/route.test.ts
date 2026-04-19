import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getBookingsByUser: vi.fn(),
  getTechnicianById: vi.fn(),
  getServiceById: vi.fn(),
  getModelById: vi.fn(),
  createBooking: vi.fn(),
  updateBookingPaymentLink: vi.fn(),
  calculatePricing: vi.fn(),
  createPaymentLink: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/bookings", () => ({
  createBooking: mocks.createBooking,
  getBookingsByUser: mocks.getBookingsByUser,
  updateBookingPaymentLink: mocks.updateBookingPaymentLink,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianById: mocks.getTechnicianById,
}))

vi.mock("@/lib/db/services", () => ({
  getServiceById: mocks.getServiceById,
}))

vi.mock("@/lib/db/models", () => ({
  getModelById: mocks.getModelById,
}))

vi.mock("@/lib/mercadopago", () => ({
  calculatePricing: mocks.calculatePricing,
  createPaymentLink: mocks.createPaymentLink,
}))

vi.mock("@/lib/logger", () => ({
  default: {
    info: mocks.loggerInfo,
    error: mocks.loggerError,
  },
}))

import { GET, POST } from "@/app/api/bookings/route"

function createJsonRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/bookings", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-access-token"

    mocks.calculatePricing.mockReturnValue({
      basePrice: 1800,
      serviceFee: 180,
      totalPrice: 1980,
      feePercentage: 10,
    })

    mocks.getSession.mockResolvedValue({
      uid: "user-1",
      role: "user",
    })
  })

  afterEach(() => {
    delete process.env.MERCADOPAGO_ACCESS_TOKEN
  })

  it("returns the current user's bookings", async () => {
    const bookings = [{ id: "booking-1" }]
    mocks.getBookingsByUser.mockResolvedValue(bookings)

    const response = await GET()
    const json = (await response.json()) as { success: boolean; data: unknown }

    expect(response.status).toBe(200)
    expect(json).toEqual({ success: true, data: bookings })
    expect(mocks.getBookingsByUser).toHaveBeenCalledWith("user-1")
  })

  it("rejects unauthenticated booking list requests", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await GET()
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toContain("iniciar sesión")
  })

  it("creates a booking and appends the payment link when MercadoPago succeeds", async () => {
    mocks.getTechnicianById.mockResolvedValue({
      id: "tech-1",
      isApproved: true,
      isActive: true,
      services: ["service-1"],
      pricing: { "service-1": { basePrice: 1800, currency: "UYU" } },
    })
    mocks.getServiceById.mockResolvedValue({
      id: "service-1",
      name: "Firmware",
      isActive: true,
      requiresDisclaimer: false,
    })
    mocks.getModelById.mockResolvedValue({
      id: "model-1",
      name: "Xiaomi 1S",
      isActive: true,
      compatibleServices: ["service-1"],
    })
    mocks.createBooking.mockResolvedValue({
      id: "booking-1",
      totalPrice: 1980,
    })
    mocks.createPaymentLink.mockResolvedValue({
      preferenceId: "pref-1",
      initPoint: "https://mp.test/pay/booking-1",
    })

    const response = await POST(
      createJsonRequest({
        technicianId: "tech-1",
        serviceId: "service-1",
        scooterModelId: "model-1",
        scheduledDate: "2026-04-20T15:00:00.000Z",
      })
    )
    const json = (await response.json()) as {
      success: boolean
      data: { booking: { id: string; paymentLinkUrl: string | null }; paymentLinkUrl: string | null }
    }

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.paymentLinkUrl).toBe("https://mp.test/pay/booking-1")
    expect(json.data.booking.paymentLinkUrl).toBe("https://mp.test/pay/booking-1")
    expect(mocks.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        technicianId: "tech-1",
        serviceId: "service-1",
        scooterModelId: "model-1",
        basePrice: 1800,
        serviceFee: 180,
        totalPrice: 1980,
      })
    )
    expect(mocks.updateBookingPaymentLink).toHaveBeenCalledWith(
      "booking-1",
      "pref-1",
      "https://mp.test/pay/booking-1"
    )
  })

  it("blocks bookings that require a disclaimer until accepted", async () => {
    mocks.getTechnicianById.mockResolvedValue({
      id: "tech-1",
      isApproved: true,
      isActive: true,
      services: ["speed-limit"],
      pricing: { "speed-limit": { basePrice: 1800, currency: "UYU" } },
    })
    mocks.getServiceById.mockResolvedValue({
      id: "speed-limit",
      name: "Speed Limit",
      isActive: true,
      requiresDisclaimer: true,
    })
    mocks.getModelById.mockResolvedValue({
      id: "model-1",
      name: "Xiaomi 1S",
      isActive: true,
      compatibleServices: ["speed-limit"],
    })

    const response = await POST(
      createJsonRequest({
        technicianId: "tech-1",
        serviceId: "speed-limit",
        scooterModelId: "model-1",
        scheduledDate: "2026-04-20T15:00:00.000Z",
        disclaimerAccepted: false,
      })
    )
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("aviso legal")
    expect(mocks.createBooking).not.toHaveBeenCalled()
  })

  it("returns a friendly validation error when the booking slot is already taken", async () => {
    mocks.getTechnicianById.mockResolvedValue({
      id: "tech-1",
      isApproved: true,
      isActive: true,
      services: ["service-1"],
      pricing: { "service-1": { basePrice: 1800, currency: "UYU" } },
    })
    mocks.getServiceById.mockResolvedValue({
      id: "service-1",
      name: "Firmware",
      isActive: true,
      requiresDisclaimer: false,
    })
    mocks.getModelById.mockResolvedValue({
      id: "model-1",
      name: "Xiaomi 1S",
      isActive: true,
      compatibleServices: ["service-1"],
    })
    mocks.createBooking.mockRejectedValue(new Error("SLOT_TAKEN"))

    const response = await POST(
      createJsonRequest({
        technicianId: "tech-1",
        serviceId: "service-1",
        scooterModelId: "model-1",
        scheduledDate: "2026-04-20T15:00:00.000Z",
      })
    )
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("ya tiene una reserva")
  })

  it("keeps the booking when MercadoPago fails and logs the incident", async () => {
    mocks.getTechnicianById.mockResolvedValue({
      id: "tech-1",
      isApproved: true,
      isActive: true,
      services: ["service-1"],
      pricing: { "service-1": { basePrice: 1800, currency: "UYU" } },
    })
    mocks.getServiceById.mockResolvedValue({
      id: "service-1",
      name: "Firmware",
      isActive: true,
      requiresDisclaimer: false,
    })
    mocks.getModelById.mockResolvedValue({
      id: "model-1",
      name: "Xiaomi 1S",
      isActive: true,
      compatibleServices: ["service-1"],
    })
    mocks.createBooking.mockResolvedValue({
      id: "booking-1",
      totalPrice: 1980,
    })
    mocks.createPaymentLink.mockRejectedValue(new Error("MP down"))

    const response = await POST(
      createJsonRequest({
        technicianId: "tech-1",
        serviceId: "service-1",
        scooterModelId: "model-1",
        scheduledDate: "2026-04-20T15:00:00.000Z",
      })
    )
    const json = (await response.json()) as {
      success: boolean
      data: { paymentLinkUrl: string | null; booking: { id: string } }
    }

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.paymentLinkUrl).toBeNull()
    expect(mocks.updateBookingPaymentLink).not.toHaveBeenCalled()
    expect(mocks.loggerError).toHaveBeenCalled()
  })

  it("accepts empty notes when the client sends null", async () => {
    mocks.getTechnicianById.mockResolvedValue({
      id: "tech-1",
      isApproved: true,
      isActive: true,
      services: ["service-1"],
      pricing: { "service-1": { basePrice: 1800, currency: "UYU" } },
    })
    mocks.getServiceById.mockResolvedValue({
      id: "service-1",
      name: "Firmware",
      isActive: true,
      requiresDisclaimer: false,
    })
    mocks.getModelById.mockResolvedValue({
      id: "model-1",
      name: "Xiaomi 1S",
      isActive: true,
      compatibleServices: ["service-1"],
    })
    mocks.createBooking.mockResolvedValue({
      id: "booking-1",
      totalPrice: 1980,
      notes: null,
    })
    mocks.createPaymentLink.mockResolvedValue({
      preferenceId: "pref-1",
      initPoint: "https://mp.test/pay/booking-1",
    })

    const response = await POST(
      createJsonRequest({
        technicianId: "tech-1",
        serviceId: "service-1",
        scooterModelId: "model-1",
        scheduledDate: "2026-04-20T15:00:00.000Z",
        notes: null,
      })
    )
    const json = (await response.json()) as {
      success: boolean
      data: { booking: { id: string } }
    }

    expect(response.status).toBe(201)
    expect(json.success).toBe(true)
    expect(mocks.createBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: null,
      })
    )
  })
})


