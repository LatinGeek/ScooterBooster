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
      totalPrice: 1980,
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

  it("creates a confirmation notification for supported booking status transitions", async () => {
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
      body: "Tu reserva fue completada. Si queres, ya podes dejar una reseña.",
      href: "/booking/booking-2",
    })
  })

  it("skips unsupported status changes", async () => {
    await notify({
      type: "bookingStatusChanged",
      userId: "user-3",
      bookingId: "booking-3",
      newStatus: "cancelled_by_user",
    })

    expect(mocks.createUserNotification).not.toHaveBeenCalled()
  })
})
