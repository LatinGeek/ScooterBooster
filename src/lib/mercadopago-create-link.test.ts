import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  preferenceCreate: vi.fn(),
  mercadoPagoConfig: vi.fn(),
  preferenceCtor: vi.fn(),
}))

vi.mock("mercadopago", () => ({
  MercadoPagoConfig: class MercadoPagoConfigMock {
    constructor(args: unknown) {
      mocks.mercadoPagoConfig(args)
      return { mockedClient: true }
    }
  },
  Preference: class PreferenceMock {
    constructor() {
      mocks.preferenceCtor()
      return {
        create: mocks.preferenceCreate,
      }
    }
  },
}))

import { createPaymentLink } from "@/lib/mercadopago"

describe("createPaymentLink", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.MERCADOPAGO_ENVIRONMENT = "test"
    process.env.MERCADOPAGO_TEST_ACCESS_TOKEN = "test-token"
    delete process.env.MERCADOPAGO_ACCESS_TOKEN
    delete process.env.MERCADOPAGO_LIVE_ACCESS_TOKEN
    process.env.NEXT_PUBLIC_APP_URL = "https://scooterbooster.test"
  })

  it("creates a checkout preference with hosted return urls and a one-hour expiration", async () => {
    mocks.preferenceCreate.mockResolvedValue({
      id: "pref-123",
      init_point: "https://mp.test/pay/pref-123",
    })

    const before = Date.now()
    const result = await createPaymentLink({
      bookingId: "booking-1",
      serviceName: "Firmware",
      scooterModelName: "Xiaomi 1S",
      serviceFee: 100,
    })
    const after = Date.now()

    expect(result).toEqual({
      preferenceId: "pref-123",
      initPoint: "https://mp.test/pay/pref-123",
    })
    expect(mocks.mercadoPagoConfig).toHaveBeenCalledWith({ accessToken: "test-token" })
    expect(mocks.preferenceCreate).toHaveBeenCalledTimes(1)

    const createArg = mocks.preferenceCreate.mock.calls[0]?.[0] as {
      body: {
        back_urls: Record<string, string>
        expires: boolean
        expiration_date_to: string
        notification_url: string
      }
    }

    expect(createArg.body.back_urls).toEqual({
      success: "https://scooterbooster.test/booking/booking-1/success",
      failure: "https://scooterbooster.test/booking/booking-1/failure",
      pending: "https://scooterbooster.test/booking/booking-1/pending",
    })
    expect(createArg.body.notification_url).toBe(
      "https://scooterbooster.test/api/payments/webhook"
    )
    expect(createArg.body.expires).toBe(true)

    const expiresAt = new Date(createArg.body.expiration_date_to).getTime()
    expect(expiresAt).toBeGreaterThanOrEqual(before + 60 * 60 * 1000)
    expect(expiresAt).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 1000)
  })

  it("throws when the backend access token is missing", async () => {
    delete process.env.MERCADOPAGO_TEST_ACCESS_TOKEN
    delete process.env.MERCADOPAGO_ACCESS_TOKEN

    await expect(
      createPaymentLink({
        bookingId: "booking-1",
        serviceName: "Firmware",
        scooterModelName: "Xiaomi 1S",
        serviceFee: 100,
      })
    ).rejects.toThrow("Missing MercadoPago test access token")
  })

  it("uses live credentials when the environment is set to live", async () => {
    process.env.MERCADOPAGO_ENVIRONMENT = "live"
    process.env.MERCADOPAGO_LIVE_ACCESS_TOKEN = "live-token"
    delete process.env.MERCADOPAGO_TEST_ACCESS_TOKEN
    delete process.env.MERCADOPAGO_ACCESS_TOKEN

    mocks.preferenceCreate.mockResolvedValue({
      id: "pref-456",
      init_point: "https://mp.test/pay/pref-456",
    })

    const result = await createPaymentLink({
      bookingId: "booking-2",
      serviceName: "Maintenance",
      scooterModelName: "Xiaomi 5",
      serviceFee: 250,
    })

    expect(result.preferenceId).toBe("pref-456")
    expect(mocks.mercadoPagoConfig).toHaveBeenCalledWith({ accessToken: "live-token" })
  })
})
