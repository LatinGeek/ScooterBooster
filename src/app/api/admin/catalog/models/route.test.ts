import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllModels: vi.fn(),
  createModel: vi.fn(),
  updateModel: vi.fn(),
  deleteModel: vi.fn(),
  addAuditLogEntry: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/db/models", () => ({
  getAllModels: mocks.getAllModels,
  createModel: mocks.createModel,
  updateModel: mocks.updateModel,
  deleteModel: mocks.deleteModel,
}))
vi.mock("@/lib/db/audit-log", () => ({ addAuditLogEntry: mocks.addAuditLogEntry }))
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }))

import { DELETE, PATCH, POST } from "@/app/api/admin/catalog/models/route"

function createRequest(method: "POST" | "PATCH" | "DELETE", body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/catalog/models", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
  })
}

const validBody = {
  brandId: "brand-1",
  name: "Xiaomi 4 Ultra",
  imageURL: null,
  specs: { maxSpeed: 25, range: 40, battery: "48V 12Ah", motor: "500W", weight: 22 },
  compatibleServices: ["service-1"],
  isActive: true,
}

describe("/api/admin/catalog/models", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a model", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.createModel.mockResolvedValue({ id: "model-1", name: "Xiaomi 4 Ultra" })

    const response = await POST(createRequest("POST", validBody))
    const json = (await response.json()) as { data: { id: string } }

    expect(response.status).toBe(201)
    expect(json.data.id).toBe("model-1")
  })

  it("updates a model", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.updateModel.mockResolvedValue({ id: "model-1", name: "NIU KQi 300X" })

    const response = await PATCH(createRequest("PATCH", { id: "model-1", ...validBody, name: "NIU KQi 300X" }))
    const json = (await response.json()) as { data: { name: string } }

    expect(response.status).toBe(200)
    expect(json.data.name).toBe("NIU KQi 300X")
  })

  it("deletes a model", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })

    const response = await DELETE(createRequest("DELETE", { id: "model-1" }))
    const json = (await response.json()) as { data: { id: string } }

    expect(response.status).toBe(200)
    expect(json.data.id).toBe("model-1")
    expect(mocks.deleteModel).toHaveBeenCalledWith("model-1")
  })
})
