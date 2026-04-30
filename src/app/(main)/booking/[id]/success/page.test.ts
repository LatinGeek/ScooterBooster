import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

import BookingPaymentSuccessPage from "@/app/(main)/booking/[id]/success/page"

describe("BookingPaymentSuccessPage", () => {
  it("preserves MercadoPago return params when redirecting to the booking detail page", async () => {
    await BookingPaymentSuccessPage({
      params: Promise.resolve({ id: "booking-1" }),
      searchParams: Promise.resolve({
        payment_id: "payment-1",
        status: "approved",
        preference_id: "pref-1",
      }),
    })

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/booking/booking-1?payment_id=payment-1&status=approved&preference_id=pref-1&return_status=success"
    )
  })
})
