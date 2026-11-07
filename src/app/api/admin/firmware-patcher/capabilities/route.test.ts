import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/logger", () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/firmware-patcher/server/engine", async () => {
  const support = await import("@/lib/firmware-patcher/server/test-support")
  return { firmwareEngine: support.fakeEngine }
})

import { GET, dynamic, maxDuration, runtime } from "@/app/api/admin/firmware-patcher/capabilities/route"
import { enableFlags, readJson, resetFakeEngine } from "@/lib/firmware-patcher/server/test-support"

function get() {
  return GET()
}

describe("GET /api/admin/firmware-patcher/capabilities", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetFakeEngine()
    enableFlags(true)
    mocks.getSession.mockResolvedValue({ uid: "admin-1", role: "admin" })
  })

  it("declares the node runtime, dynamic rendering and a 10 s budget", () => {
    expect(runtime).toBe("nodejs")
    expect(dynamic).toBe("force-dynamic")
    expect(maxDuration).toBe(10)
  })

  it("returns 404 when the server flag is off, even for anonymous callers", async () => {
    enableFlags(true)
    process.env.FIRMWARE_PATCHER_ENABLED = "false"
    mocks.getSession.mockResolvedValue(null)

    const response = await get()
    expect(response.status).toBe(404)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(mocks.getSession).not.toHaveBeenCalled()
  })

  it("returns 404 when only the public flag is off", async () => {
    process.env.NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED = "false"
    expect((await get()).status).toBe(404)
  })

  it("only treats the exact string true as enabled", async () => {
    process.env.FIRMWARE_PATCHER_ENABLED = "1"
    expect((await get()).status).toBe(404)
    process.env.FIRMWARE_PATCHER_ENABLED = "TRUE"
    expect((await get()).status).toBe(404)
  })

  it("returns 401 for anonymous callers", async () => {
    mocks.getSession.mockResolvedValue(null)
    expect((await get()).status).toBe(401)
  })

  it("returns 403 for non-staff roles", async () => {
    mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })
    const response = await get()
    expect(response.status).toBe(403)
    expect((await readJson(response)).success).toBe(false)
  })

  it.each(["admin", "technician"] as const)("returns the matrix for %s", async (role) => {
    mocks.getSession.mockResolvedValue({ uid: `${role}-1`, role })

    const response = await get()
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("no-store")

    const json = await readJson<{
      success: boolean
      data: {
        enabled: boolean
        upstream: { version: string; commit: string }
        limits: { maxInputBytes: number; maxOutputBytes: number; maxPatches: number }
        patchOrder: string[]
        roleAccess: { experimental: boolean; fullDump: boolean }
        models: { code: string; patches: { code: string; status: string; label: string }[] }[]
      }
    }>(response)
    expect(json.success).toBe(true)
    expect(json.data.enabled).toBe(true)
    expect(json.data.upstream.commit).toBe("95a8f339787a1fb6486554d61b573b8e2b688c53")
    expect(json.data.limits).toMatchObject({ maxInputBytes: 4_194_304, maxOutputBytes: 8_388_608, maxPatches: 8 })
    expect(json.data.patchOrder).toEqual(["sls", "sld", "slp", "dms", "fdv", "cce", "mss", "mss0exp"])
    expect(json.data.roleAccess).toEqual({ experimental: true, fullDump: true })
  })

  it("hides unsupported patches and never exposes chk/img", async () => {
    const response = await get()
    const json = await readJson<{ data: { models: { code: string; patches: { code: string; status: string; label: string }[] }[] } }>(
      response,
    )
    const mi6 = json.data.models.find((model) => model.code === "mi6")
    expect(mi6?.patches.map((patch) => patch.code)).toEqual(["sls", "sld", "slp", "mss", "mss0exp"])
    expect(mi6?.patches.find((patch) => patch.code === "mss0exp")?.status).toBe("experimental")
    expect(mi6?.patches.every((patch) => patch.label.length > 0)).toBe(true)
    for (const model of json.data.models) {
      expect(model.patches.some((patch) => patch.status === "unsupported")).toBe(false)
      expect(model.patches.some((patch) => ["chk", "img"].includes(patch.code))).toBe(false)
    }
    const mi4 = json.data.models.find((model) => model.code === "mi4")
    expect(mi4?.patches.some((patch) => patch.code === "mss0exp")).toBe(false)
  })

  it("carries no disclaimer fields", async () => {
    const text = JSON.stringify(await readJson(await get())).toLowerCase()
    expect(text).not.toContain("disclaimer")
  })
})
