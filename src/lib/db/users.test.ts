import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const userRef = {
    get: vi.fn(),
    set: vi.fn(),
    update: vi.fn(),
  }

  return {
    collection: vi.fn(() => ({
      doc: vi.fn(() => userRef),
    })),
    userRef,
  }
})

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: mocks.collection,
  },
}))

import { ensureUserProfile } from "@/lib/db/users"

describe("ensureUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a new profile with the supplied phone number", async () => {
    mocks.userRef.get.mockResolvedValue({ exists: false })
    mocks.userRef.set.mockResolvedValue(undefined)

    const user = await ensureUserProfile("user-1", {
      displayName: "Valentina",
      email: "valentina@example.com",
      photoURL: null,
      role: "user",
      phone: "+59899123456",
    })

    expect(mocks.userRef.set).toHaveBeenCalledWith(
      expect.objectContaining({
        displayName: "Valentina",
        email: "valentina@example.com",
        photoURL: null,
        role: "user",
        phone: "+59899123456",
        whatsappConsent: false,
      })
    )
    expect(user.phone).toBe("+59899123456")
  })

  it("fills a missing phone number on an existing profile", async () => {
    mocks.userRef.get
      .mockResolvedValueOnce({
        exists: true,
        id: "user-1",
        data: () => ({
          displayName: "Valentina",
          email: "valentina@example.com",
          photoURL: null,
          role: "user",
          phone: null,
          whatsappConsent: false,
          createdAt: "2026-05-10T00:00:00.000Z",
          updatedAt: "2026-05-10T00:00:00.000Z",
        }),
      })
      .mockResolvedValueOnce({
        exists: true,
        id: "user-1",
        data: () => ({
          displayName: "Valentina",
          email: "valentina@example.com",
          photoURL: null,
          role: "user",
          phone: "+59899123456",
          whatsappConsent: false,
          createdAt: "2026-05-10T00:00:00.000Z",
          updatedAt: "2026-05-10T00:00:01.000Z",
        }),
      })
    mocks.userRef.update.mockResolvedValue(undefined)

    const user = await ensureUserProfile("user-1", {
      displayName: "Valentina",
      email: "valentina@example.com",
      photoURL: null,
      role: "user",
      phone: "+59899123456",
    })

    expect(mocks.userRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "+59899123456",
        updatedAt: expect.any(String),
      })
    )
    expect(user.phone).toBe("+59899123456")
  })
})
