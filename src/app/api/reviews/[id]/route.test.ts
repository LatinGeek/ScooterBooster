import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  setTechnicianReply: vi.fn(),
  getReviewsByTechnician: vi.fn(),
  getTechnicianByUserId: vi.fn(),
  reviewGet: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/reviews", () => ({
  setTechnicianReply: mocks.setTechnicianReply,
  getReviewsByTechnician: mocks.getReviewsByTechnician,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianByUserId: mocks.getTechnicianByUserId,
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: mocks.reviewGet,
      })),
    })),
  },
}))

import { PATCH } from "@/app/api/reviews/[id]/route"

function createPatchRequest(body: unknown) {
  return new NextRequest("http://localhost:3000/api/reviews/review-1", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
  })
}

describe("/api/reviews/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("requires an authenticated technician or admin", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await PATCH(createPatchRequest({ technicianReply: "Gracias" }), {
      params: Promise.resolve({ id: "review-1" }),
    })
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(401)
    expect(json.success).toBe(false)
    expect(json.error).toContain("iniciar sesi")
  })

  it("blocks technicians from replying to reviews they do not own", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-user-1", role: "technician" })
    mocks.reviewGet.mockResolvedValue({
      exists: true,
      data: () => ({ technicianId: "tech-2" }),
    })
    mocks.getTechnicianByUserId.mockResolvedValue({ id: "tech-1" })

    const response = await PATCH(createPatchRequest({ technicianReply: "Gracias" }), {
      params: Promise.resolve({ id: "review-1" }),
    })
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(403)
    expect(json.success).toBe(false)
    expect(json.error).toContain("permisos")
  })

  it("validates reply content before persisting it", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-user-1", role: "technician" })
    mocks.reviewGet.mockResolvedValue({
      exists: true,
      data: () => ({ technicianId: "tech-1" }),
    })
    mocks.getTechnicianByUserId.mockResolvedValue({ id: "tech-1" })

    const response = await PATCH(createPatchRequest({ technicianReply: "" }), {
      params: Promise.resolve({ id: "review-1" }),
    })
    const json = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error).toContain("Too small")
    expect(mocks.setTechnicianReply).not.toHaveBeenCalled()
  })

  it("stores the technician reply and returns the refreshed review list", async () => {
    const refreshedReviews = [{ id: "review-1", technicianReply: "Gracias por confiar" }]

    mocks.getSession.mockResolvedValue({ uid: "tech-user-1", role: "technician" })
    mocks.reviewGet.mockResolvedValue({
      exists: true,
      data: () => ({ technicianId: "tech-1" }),
    })
    mocks.getTechnicianByUserId.mockResolvedValue({ id: "tech-1" })
    mocks.getReviewsByTechnician.mockResolvedValue(refreshedReviews)

    const response = await PATCH(createPatchRequest({ technicianReply: "Gracias por confiar" }), {
      params: Promise.resolve({ id: "review-1" }),
    })
    const json = (await response.json()) as { success: boolean; data: Array<{ id: string }> }

    expect(response.status).toBe(200)
    expect(json).toEqual({
      success: true,
      data: refreshedReviews,
    })
    expect(mocks.setTechnicianReply).toHaveBeenCalledWith("review-1", "Gracias por confiar")
    expect(mocks.getReviewsByTechnician).toHaveBeenCalledWith("tech-1")
  })
})


