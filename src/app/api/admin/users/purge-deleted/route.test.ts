import { NextRequest } from "next/server"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const userDocDelete = vi.fn()
  const reviewDelete = vi.fn()
  const bookingUpdate = vi.fn()
  const technicianDelete = vi.fn()

  const reviewBatch = {
    delete: reviewDelete,
    commit: vi.fn(),
  }

  const bookingBatch = {
    update: bookingUpdate,
    commit: vi.fn(),
  }

  const usersQueryGet = vi.fn()
  const reviewsQueryGet = vi.fn()
  const bookingsQueryGet = vi.fn()
  const techniciansQueryGet = vi.fn()
  const loggerInfo = vi.fn()
  const loggerError = vi.fn()
  const deleteUser = vi.fn()
  const getSession = vi.fn()

  const userDocRef = {
    delete: userDocDelete,
  }

  const usersCollection = {
    where: vi.fn(() => ({
      where: vi.fn(() => ({
        get: usersQueryGet,
      })),
    })),
    doc: vi.fn(() => userDocRef),
  }

  return {
    userDocDelete,
    reviewDelete,
    bookingUpdate,
    technicianDelete,
    reviewBatch,
    bookingBatch,
    usersQueryGet,
    reviewsQueryGet,
    bookingsQueryGet,
    techniciansQueryGet,
    loggerInfo,
    loggerError,
    deleteUser,
    getSession,
    userDocRef,
    collection: vi.fn((name: string) => {
      if (name === "users") return usersCollection
      if (name === "reviews") {
        return {
          where: vi.fn(() => ({ get: reviewsQueryGet })),
        }
      }
      if (name === "bookings") {
        return {
          where: vi.fn(() => ({ get: bookingsQueryGet })),
        }
      }
      if (name === "technicians") {
        return {
          where: vi.fn(() => ({
            limit: vi.fn(() => ({ get: techniciansQueryGet })),
          })),
        }
      }
      throw new Error(`Unexpected collection: ${name}`)
    }),
    batch: vi.fn()
      .mockReturnValueOnce(reviewBatch)
      .mockReturnValueOnce(bookingBatch),
  }
})

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: mocks.collection,
    batch: mocks.batch,
  },
  adminAuth: {
    deleteUser: mocks.deleteUser,
  },
}))

vi.mock("@/lib/logger", () => ({
  default: {
    info: mocks.loggerInfo,
    error: mocks.loggerError,
  },
}))

import { POST } from "@/app/api/admin/users/purge-deleted/route"

function createCronRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/admin/users/purge-deleted", {
    method: "POST",
    headers,
  })
}

describe("/api/admin/users/purge-deleted", () => {
  const originalCronSecret = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = "cron-secret"
  })

  afterAll(() => {
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = originalCronSecret
    }
  })

  it("rejects unauthenticated non-cron callers", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await POST(createCronRequest())
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toBe("No autorizado")
  })

  it("returns early when there are no expired deletions", async () => {
    mocks.usersQueryGet.mockResolvedValue({ empty: true })

    const response = await POST(
      createCronRequest({
        authorization: "Bearer cron-secret",
      })
    )
    const json = (await response.json()) as { success: boolean; data: { purged: number } }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.purged).toBe(0)
  })

  it("purges expired accounts and anonymizes related records", async () => {
    mocks.usersQueryGet.mockResolvedValue({
      empty: false,
      docs: [{ id: "user-1" }],
    })
    mocks.reviewsQueryGet.mockResolvedValue({
      docs: [{ ref: { id: "review-1" } }, { ref: { id: "review-2" } }],
    })
    mocks.bookingsQueryGet.mockResolvedValue({
      docs: [{ ref: { id: "booking-1" } }],
    })
    mocks.techniciansQueryGet.mockResolvedValue({
      empty: false,
      docs: [{ ref: { delete: mocks.technicianDelete } }],
    })

    const response = await POST(
      createCronRequest({
        authorization: "Bearer cron-secret",
      })
    )
    const json = (await response.json()) as {
      success: boolean
      data: { purged: number; failed: number; failedUids: string[] }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toMatchObject({
      purged: 1,
      failed: 0,
      failedUids: [],
    })
    expect(mocks.reviewDelete).toHaveBeenCalledTimes(2)
    expect(mocks.reviewBatch.commit).toHaveBeenCalled()
    expect(mocks.bookingUpdate).toHaveBeenCalledWith(
      { id: "booking-1" },
      expect.objectContaining({
        userId: "deleted",
        userDisplayName: "Usuario eliminado",
      })
    )
    expect(mocks.bookingBatch.commit).toHaveBeenCalled()
    expect(mocks.technicianDelete).toHaveBeenCalled()
    expect(mocks.userDocDelete).toHaveBeenCalled()
    expect(mocks.deleteUser).toHaveBeenCalledWith("user-1")
    expect(mocks.loggerInfo).toHaveBeenCalledWith({ uid: "user-1" }, "user.purged")
  })
})
