import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))

import { requireToolUser } from "./api"

describe("token extractor access guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects anonymous requests", async () => {
    mocks.getSession.mockResolvedValue(null)
    await expect(requireToolUser()).rejects.toMatchObject({ statusCode: 401 })
  })

  it("rejects regular users", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })
    await expect(requireToolUser()).rejects.toMatchObject({ statusCode: 403 })
  })

  it("allows technicians and admins", async () => {
    mocks.getSession.mockResolvedValue({ uid: "tech-1", role: "technician" })
    await expect(requireToolUser()).resolves.toEqual({ uid: "tech-1", role: "technician" })
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    await expect(requireToolUser()).resolves.toEqual({ uid: "admin-1", role: "admin" })
  })
})
