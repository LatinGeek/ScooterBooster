import { describe, expect, it } from "vitest"
import { cancelBookingSchema, createBookingSchema } from "@/lib/validators/booking"

describe("createBookingSchema", () => {
  it("accepts a valid booking payload", () => {
    const parsed = createBookingSchema.safeParse({
      technicianId: "tech-1",
      serviceId: "service-1",
      scooterModelId: "model-1",
      scheduledDate: "2026-04-20T15:00:00.000Z",
      notes: "Quiero revisar la batería",
      disclaimerAccepted: true,
    })

    expect(parsed.success).toBe(true)
  })

  it("rejects an invalid scheduled date", () => {
    const parsed = createBookingSchema.safeParse({
      technicianId: "tech-1",
      serviceId: "service-1",
      scooterModelId: "model-1",
      scheduledDate: "mañana de tarde",
    })

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toBe("Fecha inválida")
  })
})

describe("cancelBookingSchema", () => {
  it("accepts an optional cancellation reason", () => {
    expect(
      cancelBookingSchema.safeParse({ bookingId: "booking-1", reason: "Me surgió un imprevisto" })
        .success
    ).toBe(true)
  })

  it("rejects empty booking ids", () => {
    expect(cancelBookingSchema.safeParse({ bookingId: "" }).success).toBe(false)
  })
})
