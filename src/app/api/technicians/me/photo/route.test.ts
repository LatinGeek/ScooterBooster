import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getTechnicianByUserId: vi.fn(),
  fileSave: vi.fn(),
  getSignedUrl: vi.fn(),
  resize: vi.fn(),
  rotate: vi.fn(),
  webp: vi.fn(),
  toBuffer: vi.fn(),
}))

vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}))

vi.mock("@/lib/db/technicians", () => ({
  getTechnicianByUserId: mocks.getTechnicianByUserId,
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminStorage: {
    bucket: vi.fn(() => ({
      file: vi.fn(() => ({
        save: mocks.fileSave,
        getSignedUrl: mocks.getSignedUrl,
      })),
    })),
  },
}))

vi.mock("sharp", () => ({
  default: vi.fn(() => ({
    rotate: mocks.rotate.mockReturnThis(),
    resize: mocks.resize.mockReturnThis(),
    webp: mocks.webp.mockReturnThis(),
    toBuffer: mocks.toBuffer,
  })),
}))

import { POST } from "@/app/api/technicians/me/photo/route"

function createRequest(file?: File) {
  const formData = new FormData()
  if (file) formData.append("file", file)

  return new NextRequest("http://localhost:3000/api/technicians/me/photo", {
    method: "POST",
    body: formData,
    headers: { Origin: "http://localhost:3000" },
  })
}

describe("/api/technicians/me/photo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.toBuffer.mockResolvedValue(Buffer.from("image"))
    mocks.getSignedUrl.mockResolvedValue(["https://example.com/photo.webp"])
  })

  it("requires technician auth", async () => {
    mocks.getSession.mockResolvedValue(null)

    const response = await POST(createRequest())
    expect(response.status).toBe(401)
  })

  it("validates file presence", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-1", role: "technician" })
    mocks.getTechnicianByUserId.mockResolvedValue({ id: "tech-1" })

    const response = await POST(createRequest())
    const json = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(json.error).toContain("adjuntar")
  })

  it("uploads resized profile derivatives", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-1", role: "technician" })
    mocks.getTechnicianByUserId.mockResolvedValue({ id: "tech-1" })

    const file = new File([Buffer.from("img")], "profile.png", { type: "image/png" })
    const response = await POST(createRequest(file))
    const json = (await response.json()) as {
      success: boolean
      data: { photoURL: string; thumbnailURL: string }
    }

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.photoURL).toContain("https://example.com")
    expect(mocks.fileSave).toHaveBeenCalledTimes(2)
    expect(mocks.resize).toHaveBeenCalled()
  })
})
