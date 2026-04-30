import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createUserNotification: vi.fn(),
}))

vi.mock("@/lib/db/notifications", () => ({
  createUserNotification: mocks.createUserNotification,
}))

import { notify } from "@/lib/notifications"

describe("notify", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a pending-payment notification when a booking is created", async () => {
    await notify({
      type: "bookingCreated",
      userId: "user-1",
      bookingId: "booking-1",
      serviceName: "Firmware",
      serviceFee: 180,
    })

    expect(mocks.createUserNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "booking_pending_payment",
        title: "Reserva creada",
        href: "/booking/booking-1",
      }),
    )
  })

  it("creates a completion notification for supported booking status transitions", async () => {
    await notify({
      type: "bookingStatusChanged",
      userId: "user-2",
      bookingId: "booking-2",
      newStatus: "completed",
    })

    expect(mocks.createUserNotification).toHaveBeenCalledWith({
      userId: "user-2",
      type: "booking_completed",
      title: "Servicio completado",
      body: "Tu reserva fue completada. Si querés, ya podés dejar una reseña.",
      href: "/booking/booking-2",
    })
  })

  it("creates a reminder notification when asked", async () => {
    await notify({
      type: "bookingReminder",
      userId: "user-3",
      bookingId: "booking-3",
      serviceName: "Mantenimiento",
      technicianName: "Carlos",
      scheduledDateLabel: "martes 21 de abril, 10:00",
    })

    expect(mocks.createUserNotification).toHaveBeenCalledWith({
      userId: "user-3",
      type: "booking_reminder",
      title: "Recordatorio de reserva",
      body: "Mañana martes 21 de abril, 10:00 tenés Mantenimiento con Carlos.",
      href: "/booking/booking-3",
    })
  })

  it("creates a cancellation notification for user-initiated cancellations", async () => {
    await notify({
      type: "bookingStatusChanged",
      userId: "user-4",
      bookingId: "booking-4",
      newStatus: "cancelled_by_user",
    })

    expect(mocks.createUserNotification).toHaveBeenCalledWith({
      userId: "user-4",
      type: "booking_cancelled",
      title: "Reserva cancelada",
      body: "La reserva fue cancelada y ya actualizamos su estado en ScooterBooster.",
      href: "/booking/booking-4",
    })
  })
})
