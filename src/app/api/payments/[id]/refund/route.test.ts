import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getBookingById: vi.fn(),
  markBookingRefunded: vi.fn(),
  updatePaymentLinkStatus: vi.fn(),
  getUserById: vi.fn(),
  getServiceById: vi.fn(),
  getTechnicianById: vi.fn(),
  addAuditLogEntry: vi.fn(),
  notify: vi.fn(),
  sendBookingCancelledEmail: vi.fn(),
  refundCreate: vi.fn(),
}))

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  PaymentRefund: vi.fn(function PaymentRefundMock() {
    return {
      create: mocks.refundCreate,
    }
  }),
}))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/db/bookings", () => ({
  getBookingById: mocks.getBookingById,
  markBookingRefunded: mocks.markBookingRefunded,
}))
vi.mock("@/lib/db/payment-links", () => ({
  updatePaymentLinkStatus: mocks.updatePaymentLinkStatus,
}))
vi.mock("@/lib/db/users", () => ({ getUserById: mocks.getUserById }))
vi.mock("@/lib/db/services", () => ({ getServiceById: mocks.getServiceById }))
vi.mock("@/lib/db/technicians", () => ({ getTechnicianById: mocks.getTechnicianById }))
vi.mock("@/lib/db/audit-log", () => ({ addAuditLogEntry: mocks.addAuditLogEntry }))
vi.mock("@/lib/notifications", () => ({ notify: mocks.notify }))
vi.mock("@/lib/notification-emails", () => ({
  sendBookingCancelledEmail: mocks.sendBookingCancelledEmail,
}))

import { POST } from "@/app/api/payments/[id]/refund/route"

function createRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/payments/payment-1/refund", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
  })
}

describe("/api/payments/[id]/refund", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MERCADOPAGO_ACCESS_TOKEN = "mp-access-token"
  })

  it("refunds a paid booking for admins", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      technicianId: "tech-1",
      serviceId: "service-1",
      scheduledDate: "2026-04-22T13:00:00.000Z",
      paymentStatus: "paid",
      paymentId: "payment-1",
      paymentLinkId: "pref-1",
    })
    mocks.getUserById.mockResolvedValue({ uid: "user-1", email: "user@example.com" })
    mocks.getServiceById.mockResolvedValue({ id: "service-1", name: "Firmware" })
    mocks.getTechnicianById.mockResolvedValue({ id: "tech-1", displayName: "Carlos" })
    mocks.refundCreate.mockResolvedValue({ id: "refund-1" })

    const response = await POST(createRequest({ bookingId: "booking-1", reason: "Error en la reserva" }), {
      params: Promise.resolve({ id: "payment-1" }),
    })
    const json = (await response.json()) as { data: { refundId: string; paymentStatus: string } }

    expect(response.status).toBe(200)
    expect(json.data.refundId).toBe("refund-1")
    expect(json.data.paymentStatus).toBe("refunded")
    expect(mocks.markBookingRefunded).toHaveBeenCalledWith("booking-1")
    expect(mocks.updatePaymentLinkStatus).toHaveBeenCalledWith({
      preferenceId: "pref-1",
      status: "refunded",
      paymentId: "payment-1",
    })
  })

  it("rejects bookings that are not paid", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      paymentStatus: "pending",
      paymentId: "payment-1",
    })

    const response = await POST(createRequest({ bookingId: "booking-1" }), {
      params: Promise.resolve({ id: "payment-1" }),
    })
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(json.error).toContain("pago confirmado")
  })
})
