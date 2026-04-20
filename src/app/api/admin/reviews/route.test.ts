import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllReviews: vi.fn(),
  setReviewHidden: vi.fn(),
  addAuditLogEntry: vi.fn(),
}))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/db/reviews", () => ({
  getAllReviews: mocks.getAllReviews,
  setReviewHidden: mocks.setReviewHidden,
}))
vi.mock("@/lib/db/audit-log", () => ({ addAuditLogEntry: mocks.addAuditLogEntry }))

import { GET, PATCH } from "@/app/api/admin/reviews/route"

describe("/api/admin/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns reviews for admins", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.getAllReviews.mockResolvedValue([{ id: "review-1" }])

    const response = await GET()
    expect(response.status).toBe(200)
  })

  it("moderates visibility", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })

    const response = await PATCH(
      new NextRequest("http://localhost:3000/api/admin/reviews", {
        method: "PATCH",
        body: JSON.stringify({ id: "review-1", isHidden: true }),
        headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      }),
    )
    const json = (await response.json()) as { data: { isHidden: boolean } }

    expect(response.status).toBe(200)
    expect(json.data.isHidden).toBe(true)
    expect(mocks.setReviewHidden).toHaveBeenCalledWith("review-1", true, "admin-1")
    expect(mocks.addAuditLogEntry).toHaveBeenCalled()
  })
})
