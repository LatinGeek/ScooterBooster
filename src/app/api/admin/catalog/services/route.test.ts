import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllServices: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  addAuditLogEntry: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/db/services", () => ({
  getAllServices: mocks.getAllServices,
  createService: mocks.createService,
  updateService: mocks.updateService,
}))
vi.mock("@/lib/db/audit-log", () => ({ addAuditLogEntry: mocks.addAuditLogEntry }))
vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }))

import { PATCH, POST } from "@/app/api/admin/catalog/services/route"

function createRequest(method: "POST" | "PATCH", body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/catalog/services", {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
  })
}

const validBody = {
  name: "Ajuste de firmware",
  description: "Actualizamos y calibramos el firmware para mejorar la respuesta general del scooter.",
  category: "firmware",
  estimatedDuration: 90,
  requiresDisclaimer: false,
  isActive: true,
}

describe("/api/admin/catalog/services", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("creates a service", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.createService.mockResolvedValue({ id: "service-1", name: "Ajuste de firmware" })

    const response = await POST(createRequest("POST", validBody))
    const json = (await response.json()) as { data: { id: string } }

    expect(response.status).toBe(201)
    expect(json.data.id).toBe("service-1")
  })

  it("updates a service", async () => {
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
    mocks.updateService.mockResolvedValue({ id: "service-1", name: "Deslimitación avanzada" })

    const response = await PATCH(createRequest("PATCH", { id: "service-1", ...validBody, name: "Deslimitación avanzada" }))
    const json = (await response.json()) as { data: { name: string } }

    expect(response.status).toBe(200)
    expect(json.data.name).toBe("Deslimitación avanzada")
  })
})
