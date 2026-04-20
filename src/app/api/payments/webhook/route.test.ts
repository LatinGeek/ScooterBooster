import { NextRequest } from "next/server"
import crypto from "crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const processedEvents = new Map<string, Record<string, unknown>>()

  const webhookCollection = {
    doc: vi.fn((eventId: string) => ({
      get: vi.fn(async () => ({
        exists: processedEvents.has(eventId),
      })),
      set: vi.fn(async (data: Record<string, unknown>) => {
        processedEvents.set(eventId, data)
      }),
    })),
  }

  return {
    processedEvents,
    paymentGet: vi.fn(),
    getBookingByExternalReference: vi.fn(),
    updateBookingPaymentStatus: vi.fn(),
    getServiceById: vi.fn(),
    getTechnicianById: vi.fn(),
    getUserById: vi.fn(),
    notify: vi.fn(),
    addAuditLogEntry: vi.fn(),
    sendBookingConfirmedEmail: vi.fn(),
    sendBookingCancelledEmail: vi.fn(),
    loggerInfo: vi.fn(),
    loggerWarn: vi.fn(),
    loggerError: vi.fn(),
    adminDbCollection: vi.fn(() => webhookCollection),
    clearProcessedEvents: () => processedEvents.clear(),
  }
})

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: vi.fn(),
  Payment: vi.fn(function PaymentMock() {
    return {
      get: mocks.paymentGet,
    }
  }),
}))

vi.mock("@/lib/db/bookings", () => ({
  getBookingByExternalReference: mocks.getBookingByExternalReference,
  updateBookingPaymentStatus: mocks.updateBookingPaymentStatus,
}))

vi.mock("@/lib/db/services", () => ({
  getServiceById: mocks.getServiceById,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianById: mocks.getTechnicianById,
}))

vi.mock("@/lib/db/users", () => ({
  getUserById: mocks.getUserById,
}))

vi.mock("@/lib/db/audit-log", () => ({
  addAuditLogEntry: mocks.addAuditLogEntry,
}))

vi.mock("@/lib/notifications", () => ({
  notify: mocks.notify,
}))

vi.mock("@/lib/notification-emails", () => ({
  sendBookingConfirmedEmail: mocks.sendBookingConfirmedEmail,
  sendBookingCancelledEmail: mocks.sendBookingCancelledEmail,
}))

vi.mock("@/lib/logger", () => ({
  default: {
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
  },
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: mocks.adminDbCollection,
  },
}))

import { POST } from "@/app/api/payments/webhook/route"

function buildSignature(secret: string, dataId: string, requestId: string, timestamp = "1713484800") {
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`
  const digest = crypto.createHmac("sha256", secret).update(manifest).digest("hex")
  return `ts=${timestamp},v1=${digest}`
}

function createWebhookRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/payments/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  })
}

describe("/api/payments/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.clearProcessedEvents()
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "webhook-secret"
    process.env.MERCADOPAGO_ACCESS_TOKEN = "mp-access-token"
    mocks.getServiceById.mockResolvedValue({ id: "service-1", name: "Firmware" })
    mocks.getTechnicianById.mockResolvedValue({ id: "tech-1", displayName: "Carlos" })
    mocks.getUserById.mockResolvedValue({ uid: "user-1", email: "user@example.com" })
  })

  it("rejects invalid signatures when a webhook secret is configured", async () => {
    const response = await POST(
      createWebhookRequest(
        {
          id: "event-1",
          type: "payment",
          data: { id: "payment-1" },
        },
        {
          "x-request-id": "request-1",
          "x-signature": "ts=1713484800,v1=invalid",
        }
      )
    )
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(401)
    expect(json.error).toBe("Invalid signature")
    expect(mocks.paymentGet).not.toHaveBeenCalled()
  })

  it("ignores non-payment events after signature verification", async () => {
    const response = await POST(
      createWebhookRequest(
        {
          id: "event-1",
          type: "topic_authorized_payment",
          data: { id: "payment-1" },
        },
        {
          "x-request-id": "request-1",
          "x-signature": buildSignature("webhook-secret", "payment-1", "request-1"),
        }
      )
    )
    const json = (await response.json()) as { success: boolean }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mocks.paymentGet).not.toHaveBeenCalled()
  })

  it("skips already processed webhook events", async () => {
    mocks.processedEvents.set("event-1", { result: "processed" })

    const response = await POST(
      createWebhookRequest(
        {
          id: "event-1",
          type: "payment",
          data: { id: "payment-1" },
        },
        {
          "x-request-id": "request-1",
          "x-signature": buildSignature("webhook-secret", "payment-1", "request-1"),
        }
      )
    )
    const json = (await response.json()) as { success: boolean }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mocks.paymentGet).not.toHaveBeenCalled()
  })

  it("confirms the booking when MercadoPago reports an approved payment", async () => {
    mocks.paymentGet.mockResolvedValue({
      status: "approved",
      external_reference: "booking_booking-1",
    })
    mocks.getBookingByExternalReference.mockResolvedValue({ id: "booking-1" })

    const response = await POST(
      createWebhookRequest(
        {
          id: "event-1",
          type: "payment",
          data: { id: "payment-1" },
        },
        {
          "x-request-id": "request-1",
          "x-signature": buildSignature("webhook-secret", "payment-1", "request-1"),
        }
      )
    )
    const json = (await response.json()) as { success: boolean }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mocks.getBookingByExternalReference).toHaveBeenCalledWith("booking_booking-1")
    expect(mocks.updateBookingPaymentStatus).toHaveBeenCalledWith("booking-1", "paid", "confirmed")
    expect(mocks.processedEvents.get("event-1")).toMatchObject({
      eventType: "payment",
      paymentId: "payment-1",
      mpStatus: "approved",
      bookingId: "booking-1",
      result: "processed",
    })
  })

  it("marks unknown external references as processed without mutating bookings", async () => {
    mocks.paymentGet.mockResolvedValue({
      status: "approved",
      external_reference: "booking_missing",
    })
    mocks.getBookingByExternalReference.mockResolvedValue(null)

    const response = await POST(
      createWebhookRequest(
        {
          id: "event-1",
          type: "payment",
          data: { id: "payment-1" },
        },
        {
          "x-request-id": "request-1",
          "x-signature": buildSignature("webhook-secret", "payment-1", "request-1"),
        }
      )
    )
    const json = (await response.json()) as { success: boolean }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mocks.updateBookingPaymentStatus).not.toHaveBeenCalled()
    expect(mocks.processedEvents.get("event-1")).toMatchObject({
      eventType: "payment",
      paymentId: "payment-1",
      mpStatus: "approved",
      result: "no_booking",
    })
  })

  it("keeps the booking pending when MercadoPago rejects the payment", async () => {
    mocks.paymentGet.mockResolvedValue({
      status: "rejected",
      external_reference: "booking_booking-1",
    })
    mocks.getBookingByExternalReference.mockResolvedValue({ id: "booking-1" })

    const response = await POST(
      createWebhookRequest(
        {
          id: "event-1",
          type: "payment",
          data: { id: "payment-1" },
        },
        {
          "x-request-id": "request-1",
          "x-signature": buildSignature("webhook-secret", "payment-1", "request-1"),
        }
      )
    )

    expect(response.status).toBe(200)
    expect(mocks.updateBookingPaymentStatus).toHaveBeenCalledWith("booking-1", "pending")
  })

  it("returns 500 so MercadoPago can retry when processing fails", async () => {
    mocks.paymentGet.mockRejectedValue(new Error("mercadopago unavailable"))

    const response = await POST(
      createWebhookRequest(
        {
          id: "event-1",
          type: "payment",
          data: { id: "payment-1" },
        },
        {
          "x-request-id": "request-1",
          "x-signature": buildSignature("webhook-secret", "payment-1", "request-1"),
        }
      )
    )
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(500)
    expect(json.error).toBe("Processing error")
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
