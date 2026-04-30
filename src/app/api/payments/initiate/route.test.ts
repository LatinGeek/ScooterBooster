import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getBookingById: vi.fn(),
  updateBookingPaymentLink: vi.fn(),
  upsertPaymentLinkRecord: vi.fn(),
  getServiceById: vi.fn(),
  getModelById: vi.fn(),
  createPaymentLink: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/bookings", () => ({
  getBookingById: mocks.getBookingById,
  updateBookingPaymentLink: mocks.updateBookingPaymentLink,
}))

vi.mock("@/lib/db/payment-links", () => ({
  upsertPaymentLinkRecord: mocks.upsertPaymentLinkRecord,
}))

vi.mock("@/lib/db/services", () => ({
  getServiceById: mocks.getServiceById,
}))

vi.mock("@/lib/db/models", () => ({
  getModelById: mocks.getModelById,
}))

vi.mock("@/lib/mercadopago", () => ({
  createPaymentLink: mocks.createPaymentLink,
}))

vi.mock("@/lib/logger", () => ({
  default: {
    info: mocks.loggerInfo,
    error: mocks.loggerError,
  },
}))

import { POST } from "@/app/api/payments/initiate/route"

function createPostRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/payments/initiate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/payments/initiate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires authentication", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await POST(createPostRequest({ bookingId: "booking-1" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toContain("iniciar sesión")
  })

  it("only allows the booking owner to initiate payment", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-2",
      status: "pending",
    })

    const response = await POST(createPostRequest({ bookingId: "booking-1" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toContain("permisos")
  })

  it("blocks payment recreation for non-pending bookings", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      status: "confirmed",
    })

    const response = await POST(createPostRequest({ bookingId: "booking-1" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("pendiente de pago")
  })

  it("reuses an existing payment link for a pending booking", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      scheduledDate: "2099-04-20T15:00:00.000Z",
      paymentLinkId: "pref-existing",
      paymentLinkUrl: "https://mp.test/existing",
      status: "pending",
    })

    const response = await POST(createPostRequest({ bookingId: "booking-1" }))
    const json = (await response.json()) as {
      success: boolean
      data: { initPoint: string; preferenceId: string }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual({
      initPoint: "https://mp.test/existing",
      preferenceId: "pref-existing",
    })
    expect(mocks.createPaymentLink).not.toHaveBeenCalled()
    expect(mocks.updateBookingPaymentLink).not.toHaveBeenCalled()
    expect(mocks.upsertPaymentLinkRecord).not.toHaveBeenCalled()
  })

  it("creates a payment link for a pending booking", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      serviceId: "service-1",
      scooterModelId: "model-1",
      scheduledDate: "2099-04-20T15:00:00.000Z",
      serviceFee: 180,
      totalPrice: 1980,
      status: "pending",
      paymentLinkId: null,
      paymentLinkUrl: null,
    })
    mocks.getServiceById.mockResolvedValue({ id: "service-1", name: "Firmware" })
    mocks.getModelById.mockResolvedValue({ id: "model-1", name: "Xiaomi 1S" })
    mocks.createPaymentLink.mockResolvedValue({
      preferenceId: "pref-1",
      initPoint: "https://mp.test/pay",
    })

    const response = await POST(createPostRequest({ bookingId: "booking-1" }))
    const json = (await response.json()) as {
      success: boolean
      data: { initPoint: string; preferenceId: string }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual({
      initPoint: "https://mp.test/pay",
      preferenceId: "pref-1",
    })
    expect(mocks.updateBookingPaymentLink).toHaveBeenCalledWith(
      "booking-1",
      "pref-1",
      "https://mp.test/pay"
    )
    expect(mocks.upsertPaymentLinkRecord).toHaveBeenCalledWith({
      preferenceId: "pref-1",
      bookingId: "booking-1",
      initPoint: "https://mp.test/pay",
    })
    expect(mocks.createPaymentLink).toHaveBeenCalledWith({
      bookingId: "booking-1",
      serviceName: "Firmware",
      scooterModelName: "Xiaomi 1S",
      serviceFee: 180,
    })
    expect(mocks.loggerInfo).toHaveBeenCalled()
  })

  it("returns a handled error when payment link creation fails", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      serviceId: "service-1",
      scooterModelId: "model-1",
      scheduledDate: "2099-04-20T15:00:00.000Z",
      serviceFee: 180,
      status: "pending",
      paymentLinkId: null,
      paymentLinkUrl: null,
    })
    mocks.getServiceById.mockResolvedValue({ id: "service-1", name: "Firmware" })
    mocks.getModelById.mockResolvedValue({ id: "model-1", name: "Xiaomi 1S" })
    mocks.createPaymentLink.mockRejectedValue(new Error("PA_UNAUTHORIZED_RESULT_FROM_POLICIES"))

    const response = await POST(createPostRequest({ bookingId: "booking-1" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(503)
    expect(json.success).toBe(false)
    expect(json.error).toContain("No se pudo generar el link de pago")
    expect(mocks.loggerError).toHaveBeenCalled()
  })

  it("blocks payment recreation for past bookings", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      status: "pending",
      scheduledDate: "2020-04-20T15:00:00.000Z",
    })

    const response = await POST(createPostRequest({ bookingId: "booking-1" }))
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("reserva vencida")
    expect(mocks.createPaymentLink).not.toHaveBeenCalled()
  })
})
