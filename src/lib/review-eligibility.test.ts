import { describe, expect, it } from "vitest"
import { canUserReviewBooking, isBookingOverdueForUserReview } from "@/lib/review-eligibility"

describe("review eligibility", () => {
  it("allows overdue paid confirmed bookings to be reviewed after one day", () => {
    expect(
      isBookingOverdueForUserReview(
        {
          scheduledDate: "2026-05-08T10:00:00.000Z",
          status: "confirmed",
          paymentStatus: "paid",
        },
        new Date("2026-05-09T10:00:01.000Z"),
      ),
    ).toBe(true)
  })

  it("does not allow unpaid overdue bookings to be reviewed", () => {
    expect(
      canUserReviewBooking(
        {
          scheduledDate: "2026-05-08T10:00:00.000Z",
          status: "confirmed",
          paymentStatus: "pending",
        },
        new Date("2026-05-10T12:00:00.000Z"),
      ),
    ).toBe(false)
  })

  it("always allows completed bookings to be reviewed", () => {
    expect(
      canUserReviewBooking({
        scheduledDate: "2026-05-10T10:00:00.000Z",
        status: "completed",
        paymentStatus: "paid",
      }),
    ).toBe(true)
  })
})
