import { describe, expect, it } from "vitest"
import {
  buildTechnicianContactMessage,
  formatFriendlySpanishDateTime,
  WA_MESSAGES,
} from "@/lib/messages"

describe("formatFriendlySpanishDateTime", () => {
  it("formats datetimes in friendly Spanish with Montevideo time", () => {
    expect(formatFriendlySpanishDateTime("2099-05-10T14:30:00.000Z")).toBe(
      "domingo 10 de mayo de 2099, 11:30",
    )
  })
})

describe("buildTechnicianContactMessage", () => {
  it("builds the technician WhatsApp message with the requested layout", () => {
    expect(
      buildTechnicianContactMessage({
        bookingId: "booking-123",
        scooterModel: "Xiaomi 1S",
        service: "Firmware",
        bookingDateTime: "2099-05-10T14:30:00.000Z",
      }),
    ).toBe(
      [
        "Hola, tengo una reserva en ScooterBooster (ID: booking-123)",
        "",
        "Modelo de monopatín: Xiaomi 1S",
        "Servicio: Firmware",
        "Día y hora de preferencia: domingo 10 de mayo de 2099, 11:30",
      ].join("\n"),
    )
  })

  it("uses the shared WA message helper for technician contact", () => {
    expect(
      WA_MESSAGES.userContactTechnician({
        bookingId: "booking-123",
        scooterModel: "Xiaomi 1S",
        service: "Firmware",
        bookingDateTime: "2099-05-10T14:30:00.000Z",
      }),
    ).toContain("Modelo de monopatín: Xiaomi 1S")
  })
})
