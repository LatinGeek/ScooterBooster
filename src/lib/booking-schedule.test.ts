import { describe, expect, it } from "vitest"

import {
  filterBookableSlots,
  getEarliestBookingTime,
  getUruguayDate,
  hasBookingNotice,
  parseUruguayBookingTime,
} from "@/lib/booking-schedule"

describe("Uruguay booking schedule", () => {
  // 10:15 in Uruguay, regardless of the environment's local time zone.
  const now = Date.parse("2026-10-22T13:15:00.000Z")

  it("allows same-day bookings with exactly four hours of notice", () => {
    expect(hasBookingNotice(parseUruguayBookingTime("2026-10-22T14:15"), now)).toBe(true)
    expect(hasBookingNotice(parseUruguayBookingTime("2026-10-22T14:14"), now)).toBe(false)
    expect(getEarliestBookingTime(now).toISOString()).toBe("2026-10-22T17:15:00.000Z")
  })

  it("filters earlier slots while preserving the technician's available hours", () => {
    expect(filterBookableSlots("2026-10-22", ["10:00", "14:00", "15:00", "16:00"], now)).toEqual([
      "15:00",
      "16:00",
    ])
    expect(filterBookableSlots("2026-10-23", ["09:00", "10:00"], now)).toEqual(["09:00", "10:00"])
  })

  it("uses Uruguay's calendar date at the UTC day boundary", () => {
    expect(getUruguayDate(new Date("2026-10-23T01:00:00Z"))).toBe("2026-10-22")
    const lateNight = Date.parse("2026-10-23T01:30:00Z") // 22:30 Uruguay
    expect(getUruguayDate(getEarliestBookingTime(lateNight))).toBe("2026-10-23")
    expect(filterBookableSlots("2026-10-22", ["23:00"], lateNight)).toEqual([])
    expect(filterBookableSlots("2026-10-23", ["02:00", "03:00"], lateNight)).toEqual(["03:00"])
  })

  it("converts Uruguay wall time to the same instant in every host time zone", () => {
    expect(parseUruguayBookingTime("2026-10-22T15:00").toISOString()).toBe(
      "2026-10-22T18:00:00.000Z"
    )
    expect(hasBookingNotice(parseUruguayBookingTime("2026-10-22T"), now)).toBe(false)
    expect(hasBookingNotice(new Date("invalid"), now)).toBe(false)
    expect(hasBookingNotice(new Date(now - 1), now)).toBe(false)
  })
})
