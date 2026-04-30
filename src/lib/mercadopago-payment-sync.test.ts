import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  paymentGet: vi.fn(),
  getBookingByExternalReference: vi.fn(),
  setBookingPaymentReference: vi.fn(),
  updateBookingPaymentStatus: vi.fn(),
  updatePaymentLinkStatus: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class MercadoPagoConfigMock {
    constructor() {
      return {}
    }
  },
  Payment: class PaymentMock {
    constructor() {
      return {
        get: mocks.paymentGet,
      }
    }
  },
}))

vi.mock("@/lib/db/bookings", () => ({
  getBookingByExternalReference: mocks.getBookingByExternalReference,
  setBookingPaymentReference: mocks.setBookingPaymentReference,
  updateBookingPaymentStatus: mocks.updateBookingPaymentStatus,
}))

vi.mock("@/lib/db/payment-links", () => ({
  updatePaymentLinkStatus: mocks.updatePaymentLinkStatus,
}))

vi.mock("@/lib/logger", () => ({
  default: {
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
  },
}))

import { syncMercadoPagoPayment } from "@/lib/mercadopago-payment-sync"

describe("syncMercadoPagoPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MERCADOPAGO_ACCESS_TOKEN = "test-token"
  })

  it("confirms the booking when MercadoPago reports an approved payment", async () => {
    mocks.paymentGet.mockResolvedValue({
      status: "approved",
      transaction_amount: 100,
      external_reference: "booking_booking-1",
    })
    mocks.getBookingByExternalReference.mockResolvedValue({
      id: "booking-1",
      serviceFee: 100,
      paymentLinkId: "pref-1",
    })

    const result = await syncMercadoPagoPayment({
      paymentId: "payment-1",
      expectedBookingId: "booking-1",
      lastWebhookEventId: "event-1",
    })

    expect(result).toEqual({
      bookingId: "booking-1",
      paymentId: "payment-1",
      mpStatus: "approved",
      result: "processed",
    })
    expect(mocks.setBookingPaymentReference).toHaveBeenCalledWith("booking-1", "payment-1")
    expect(mocks.updateBookingPaymentStatus).toHaveBeenCalledWith("booking-1", "paid", "confirmed")
    expect(mocks.updatePaymentLinkStatus).toHaveBeenCalledWith({
      preferenceId: "pref-1",
      status: "approved",
      paymentId: "payment-1",
      lastWebhookEventId: "event-1",
    })
  })

  it("refuses to sync a payment that belongs to another booking", async () => {
    mocks.paymentGet.mockResolvedValue({
      status: "approved",
      transaction_amount: 100,
      external_reference: "booking_booking-2",
    })
    mocks.getBookingByExternalReference.mockResolvedValue({
      id: "booking-2",
      serviceFee: 100,
      paymentLinkId: "pref-2",
    })

    const result = await syncMercadoPagoPayment({
      paymentId: "payment-1",
      expectedBookingId: "booking-1",
    })

    expect(result).toEqual({
      bookingId: "booking-2",
      paymentId: "payment-1",
      mpStatus: "approved",
      result: "booking_mismatch",
    })
    expect(mocks.updateBookingPaymentStatus).not.toHaveBeenCalled()
  })
})
