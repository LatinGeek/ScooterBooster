import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllBrands: vi.fn(),
  createBrand: vi.fn(),
  updateBrand: vi.fn(),
  addAuditLogEntry: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/db/brands", () => ({
  getAllBrands: mocks.getAllBrands,
  createBrand: mocks.createBrand,
  updateBrand: mocks.updateBrand,
}))
vi.mock("@/lib/db/audit-log", () => ({ addAuditLogEntry: mocks.addAuditLogEntry }))
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }))

import { GET, PATCH, POST } from "@/app/api/admin/catalog/brands/route"

function createRequest(method: "POST" | "PATCH", body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/catalog/brands", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
  })
}

describe("/api/admin/catalog/brands", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("blocks non-admin access", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })
    const response = await GET()
    expect(response.status).toBe(403)
  })

  it("creates a brand", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.createBrand.mockResolvedValue({ id: "brand-1", name: "Xiaomi", isActive: true })

    const response = await POST(createRequest("POST", { name: "Xiaomi", isActive: true }))
    const json = (await response.json()) as { data: { id: string } }

    expect(response.status).toBe(201)
    expect(json.data.id).toBe("brand-1")
    expect(mocks.addAuditLogEntry).toHaveBeenCalled()
  })

  it("updates a brand", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.updateBrand.mockResolvedValue({ id: "brand-1", name: "NIU", isActive: false })

    const response = await PATCH(createRequest("PATCH", { id: "brand-1", name: "NIU", isActive: false }))
    const json = (await response.json()) as { data: { name: string } }

    expect(response.status).toBe(200)
    expect(json.data.name).toBe("NIU")
  })
})
