import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getConfirmedBookingsScheduledBetween: vi.fn(),
  markBookingReminderSent: vi.fn(),
  getServiceById: vi.fn(),
  getTechnicianById: vi.fn(),
  getUserById: vi.fn(),
  addAuditLogEntry: vi.fn(),
  notify: vi.fn(),
  sendBookingReminderEmail: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/bookings", () => ({
  getConfirmedBookingsScheduledBetween: mocks.getConfirmedBookingsScheduledBetween,
  markBookingReminderSent: mocks.markBookingReminderSent,
}))

vi.mock("@/lib/db/services", () => ({
  getServiceById: mocks.getServiceById,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianById: mocks.getTechnicianById,
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
  sendBookingReminderEmail: mocks.sendBookingReminderEmail,
}))

import { POST } from "@/app/api/cron/booking-reminders/route"

function createPostRequest(headers: Record<string, string> = {}) {
  return new NextRequest("https://www.scooterbooster.uy/api/cron/booking-reminders", {
    method: "POST",
    headers,
  })
}

describe("/api/cron/booking-reminders", () => {
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-20T15:00:00.000Z"))
    process.env.CRON_SECRET = "cron-secret"
    mocks.getServiceById.mockResolvedValue({ id: "service-1", name: "Firmware" })
    mocks.getTechnicianById.mockResolvedValue({ id: "tech-1", displayName: "Carlos" })
    mocks.getUserById.mockResolvedValue({ uid: "user-1", email: "user@example.com" })
  })

  afterEach(() => {
    vi.useRealTimers()
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = originalCronSecret
  })

  it("rejects unauthenticated non-cron callers", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await POST(createPostRequest())
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
  })

  it("allows admin users to trigger the reminder job manually", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getConfirmedBookingsScheduledBetween.mockResolvedValue([])

    const response = await POST(createPostRequest())
    const json = (await response.json()) as { success: boolean; data: { processed: number } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.processed).toBe(0)
  })

  it("sends reminders for tomorrow confirmed bookings when cron is authorized", async () => {
    mocks.getConfirmedBookingsScheduledBetween.mockResolvedValue([
      {
        id: "booking-1",
        userId: "user-1",
        technicianId: "tech-1",
        serviceId: "service-1",
        scheduledDate: "2026-04-21T13:00:00.000Z",
        reminderSentAt: null,
      },
      {
        id: "booking-2",
        userId: "user-1",
        technicianId: "tech-1",
        serviceId: "service-1",
        scheduledDate: "2026-04-21T15:00:00.000Z",
        reminderSentAt: "2026-04-20T12:00:00.000Z",
      },
    ])

    const response = await POST(
      createPostRequest({
        Authorization: "Bearer cron-secret",
      }),
    )
    const json = (await response.json()) as {
      success: boolean
      data: { processed: number; skipped: number }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.processed).toBe(1)
    expect(json.data.skipped).toBe(1)
    expect(mocks.notify).toHaveBeenCalledTimes(1)
    expect(mocks.sendBookingReminderEmail).toHaveBeenCalledTimes(1)
    expect(mocks.markBookingReminderSent).toHaveBeenCalledWith("booking-1")
    expect(mocks.addAuditLogEntry).toHaveBeenCalledTimes(1)
  })
})
