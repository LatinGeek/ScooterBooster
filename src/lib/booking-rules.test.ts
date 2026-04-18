import { describe, expect, it } from "vitest"
import {
  canTransitionBookingStatus,
  canUserCancelBooking,
  requiresBookingDisclaimer,
} from "@/lib/booking-rules"

describe("requiresBookingDisclaimer", () => {
  it("returns true when the selected service requires a legal disclaimer", () => {
    expect(requiresBookingDisclaimer({ requiresDisclaimer: true })).toBe(true)
  })

  it("returns false for optional or missing services", () => {
    expect(requiresBookingDisclaimer({ requiresDisclaimer: false })).toBe(false)
    expect(requiresBookingDisclaimer(undefined)).toBe(false)
  })
})

describe("canTransitionBookingStatus", () => {
  it("allows users to cancel pending bookings", () => {
    expect(canTransitionBookingStatus("user", "pending", "cancelled_by_user")).toBe(true)
  })

  it("blocks users from confirming their own bookings", () => {
    expect(canTransitionBookingStatus("user", "pending", "confirmed")).toBe(false)
  })

  it("allows technicians to progress active work", () => {
    expect(canTransitionBookingStatus("technician", "confirmed", "in_progress")).toBe(true)
    expect(canTransitionBookingStatus("technician", "in_progress", "completed")).toBe(true)
  })

  it("lets admins perform broader recovery transitions", () => {
    expect(canTransitionBookingStatus("admin", "pending", "expired")).toBe(true)
  })
})

describe("canUserCancelBooking", () => {
  it("allows cancellation for future bookings", () => {
    expect(
      canUserCancelBooking(
        { scheduledDate: "2026-04-20T15:00:00.000Z" },
        new Date("2026-04-19T12:00:00.000Z")
      )
    ).toBe(true)
  })

  it("blocks cancellation for past bookings", () => {
    expect(
      canUserCancelBooking(
        { scheduledDate: "2026-04-18T10:00:00.000Z" },
        new Date("2026-04-18T12:00:00.000Z")
      )
    ).toBe(false)
  })
})
