import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/server", async () => {
  const actual = await vi.importActual<typeof import("next/server")>("next/server")
  return {
    ...actual,
    after: vi.fn((callback: () => unknown) => callback()),
  }
})

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getBookingById: vi.fn(),
  updateBookingStatus: vi.fn(),
  getTechnicianByUserId: vi.fn(),
  getTechnicianById: vi.fn(),
  getServiceById: vi.fn(),
  getUserById: vi.fn(),
  notify: vi.fn(),
  addAuditLogEntry: vi.fn(),
  sendBookingConfirmedEmail: vi.fn(),
  sendBookingCompletedEmail: vi.fn(),
  sendBookingCancelledEmail: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/bookings", () => ({
  getBookingById: mocks.getBookingById,
  updateBookingStatus: mocks.updateBookingStatus,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianByUserId: mocks.getTechnicianByUserId,
  getTechnicianById: mocks.getTechnicianById,
}))

vi.mock("@/lib/db/services", () => ({
  getServiceById: mocks.getServiceById,
}))

vi.mock("@/lib/db/users", () => ({
  getUserById: mocks.getUserById,
}))

vi.mock("@/lib/db/audit-log", () => ({
  addAuditLogEntry: mocks.addAuditLogEntry,
}))

vi.mock("@/lib/notifications", () => ({
  notify: mocks.notify,
}))

vi.mock("@/lib/notification-emails", () => ({
  sendBookingConfirmedEmail: mocks.sendBookingConfirmedEmail,
  sendBookingCompletedEmail: mocks.sendBookingCompletedEmail,
  sendBookingCancelledEmail: mocks.sendBookingCancelledEmail,
}))

import { GET, PATCH } from "@/app/api/bookings/[id]/route"

function createPatchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/bookings/booking-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

const bookingFixture = {
  id: "booking-1",
  userId: "user-1",
  technicianId: "tech-1",
  status: "pending" as const,
  scheduledDate: "2026-04-20T15:00:00.000Z",
}

describe("/api/bookings/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getBookingById.mockResolvedValue(bookingFixture)
    mocks.getTechnicianById.mockResolvedValue({ id: "tech-1", displayName: "Carlos" })
    mocks.getServiceById.mockResolvedValue({ id: "service-1", name: "Firmware" })
    mocks.getUserById.mockResolvedValue({ uid: "user-1", email: "user@example.com" })
  })

  it("lets the booking owner fetch their booking", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })

    const response = await GET(new NextRequest("http://localhost:3000"), {
      params: Promise.resolve({ id: "booking-1" }),
    })
    const json = (await response.json()) as { success: boolean; data: { id: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("booking-1")
  })

  it("blocks technicians from viewing bookings they do not own", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-user-2", role: "technician" })
    mocks.getTechnicianByUserId.mockResolvedValue({ id: "tech-2" })

    const response = await GET(new NextRequest("http://localhost:3000"), {
      params: Promise.resolve({ id: "booking-1" }),
    })
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toContain("permisos")
  })

  it("lets technicians confirm their own pending bookings", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-user-1", role: "technician" })
    mocks.getTechnicianByUserId.mockResolvedValue({ id: "tech-1" })
    mocks.getBookingById
      .mockResolvedValueOnce(bookingFixture)
      .mockResolvedValueOnce({ ...bookingFixture, status: "confirmed" })

    const response = await PATCH(createPatchRequest({ status: "confirmed" }), {
      params: Promise.resolve({ id: "booking-1" }),
    })
    const json = (await response.json()) as { success: boolean; data: { status: string } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.status).toBe("confirmed")
    expect(mocks.updateBookingStatus).toHaveBeenCalledWith("booking-1", "confirmed")
  })

  it("blocks users from cancelling past bookings", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-20T16:00:00.000Z"))
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })
    mocks.getBookingById.mockResolvedValue({
      ...bookingFixture,
      scheduledDate: "2026-04-20T15:00:00.000Z",
    })

    const response = await PATCH(createPatchRequest({ status: "cancelled_by_user" }), {
      params: Promise.resolve({ id: "booking-1" }),
    })
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("reserva pasada")

    vi.useRealTimers()
  })

  it("rejects invalid role-based status transitions", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })

    const response = await PATCH(createPatchRequest({ status: "confirmed" }), {
      params: Promise.resolve({ id: "booking-1" }),
    })
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain('No es posible cambiar el estado de "pending" a "confirmed"')
  })
})


