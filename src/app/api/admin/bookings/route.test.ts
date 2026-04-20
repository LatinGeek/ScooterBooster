import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllBookings: vi.fn(),
  getBookingById: vi.fn(),
  updateBookingStatus: vi.fn(),
  getUserById: vi.fn(),
  getServiceById: vi.fn(),
  getTechnicianById: vi.fn(),
  addAuditLogEntry: vi.fn(),
  notify: vi.fn(),
  sendBookingCancelledEmail: vi.fn(),
}))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/db/bookings", () => ({
  getAllBookings: mocks.getAllBookings,
  getBookingById: mocks.getBookingById,
  updateBookingStatus: mocks.updateBookingStatus,
}))
vi.mock("@/lib/db/users", () => ({ getUserById: mocks.getUserById }))
vi.mock("@/lib/db/services", () => ({ getServiceById: mocks.getServiceById }))
vi.mock("@/lib/db/technicians", () => ({ getTechnicianById: mocks.getTechnicianById }))
vi.mock("@/lib/db/audit-log", () => ({ addAuditLogEntry: mocks.addAuditLogEntry }))
vi.mock("@/lib/notifications", () => ({ notify: mocks.notify }))
vi.mock("@/lib/notification-emails", () => ({
  sendBookingCancelledEmail: mocks.sendBookingCancelledEmail,
}))

import { GET, PATCH } from "@/app/api/admin/bookings/route"

function createRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/bookings", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
  })
}

describe("/api/admin/bookings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns bookings for admins", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getAllBookings.mockResolvedValue([{ id: "booking-1" }])

    const response = await GET()
    const json = (await response.json()) as { data: Array<{ id: string }> }

    expect(response.status).toBe(200)
    expect(json.data[0]?.id).toBe("booking-1")
  })

  it("cancels an unpaid booking", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      userId: "user-1",
      technicianId: "tech-1",
      serviceId: "service-1",
      scheduledDate: "2026-04-22T13:00:00.000Z",
      status: "confirmed",
      paymentStatus: "pending",
    })
    mocks.getUserById.mockResolvedValue({ uid: "user-1", email: "user@example.com" })
    mocks.getServiceById.mockResolvedValue({ id: "service-1", name: "Firmware" })
    mocks.getTechnicianById.mockResolvedValue({ id: "tech-1", displayName: "Carlos" })

    const response = await PATCH(
      createRequest({ id: "booking-1", action: "cancel", reason: "Cliente pidió reprogramar" }),
    )
    const json = (await response.json()) as { data: { status: string } }

    expect(response.status).toBe(200)
    expect(json.data.status).toBe("cancelled_by_user")
    expect(mocks.updateBookingStatus).toHaveBeenCalledWith("booking-1", "cancelled_by_user")
    expect(mocks.addAuditLogEntry).toHaveBeenCalled()
  })

  it("rejects cancellation of paid bookings until refund is processed", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getBookingById.mockResolvedValue({
      id: "booking-1",
      status: "confirmed",
      paymentStatus: "paid",
    })

    const response = await PATCH(createRequest({ id: "booking-1", action: "cancel" }))
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(json.error).toContain("reembolso")
  })
})
