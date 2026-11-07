import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  captureException: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }))
vi.mock("@/lib/logger", () => ({
  default: { info: mocks.loggerInfo, warn: mocks.loggerWarn, error: mocks.loggerError },
}))
vi.mock("@/lib/firmware-patcher/server/engine", async () => {
  const support = await import("@/lib/firmware-patcher/server/test-support")
  return { firmwareEngine: support.fakeEngine }
})

import { POST, dynamic, maxDuration, runtime } from "@/app/api/admin/firmware-patcher/detect/route"
import { EngineFailure } from "@/lib/firmware-patcher/server/contract"
import {
  buildForm,
  enableFlags,
  fakeDetection,
  fakeEngine,
  makeFirmware,
  postRequest,
  readJson,
  resetFakeEngine,
} from "@/lib/firmware-patcher/server/test-support"

const PATH = "/api/admin/firmware-patcher/detect"

type DetectBody = {
  success: boolean
  error?: string
  data?: {
    supported: boolean
    message: string | null
    availablePatches: { code: string; status: string; label: string }[]
    inputSha256: string
    size: number
    detection: { model: string | null; supported: boolean; hits: string[]; notes: string[]; score: number }
  }
}

function detect(form = buildForm(), headers?: Record<string, string>) {
  return POST(postRequest(PATH, form, headers))
}

describe("POST /api/admin/firmware-patcher/detect", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetFakeEngine()
    enableFlags(true)
    mocks.getSession.mockResolvedValue({ uid: "tech-1", role: "technician" })
  })

  it("declares the node runtime, dynamic rendering and a 10 s budget", () => {
    expect(runtime).toBe("nodejs")
    expect(dynamic).toBe("force-dynamic")
    expect(maxDuration).toBe(10)
  })

  describe("flag, origin and roles", () => {
    it("returns 404 before authentication when the flag is off", async () => {
      enableFlags(false)
      mocks.getSession.mockResolvedValue(null)

      const response = await detect()
      expect(response.status).toBe(404)
      expect(mocks.getSession).not.toHaveBeenCalled()
      expect(fakeEngine.detect).not.toHaveBeenCalled()
    })

    it("rejects a foreign Origin with 403", async () => {
      const response = await detect(buildForm(), { origin: "https://evil.example" })
      expect(response.status).toBe(403)
      expect(fakeEngine.detect).not.toHaveBeenCalled()
    })

    it("returns 401 for anonymous and 403 for user role", async () => {
      mocks.getSession.mockResolvedValue(null)
      expect((await detect()).status).toBe(401)

      mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })
      expect((await detect()).status).toBe(403)
      expect(fakeEngine.detect).not.toHaveBeenCalled()
    })

    it.each(["admin", "technician"] as const)("allows %s", async (role) => {
      mocks.getSession.mockResolvedValue({ uid: `${role}-1`, role })
      const response = await detect()
      expect(response.status).toBe(200)
      expect(response.headers.get("cache-control")).toBe("no-store")
    })
  })

  describe("upload validation", () => {
    it("rejects a missing file", async () => {
      const response = await detect(buildForm({ file: null }))
      expect(response.status).toBe(400)
      expect((await readJson<DetectBody>(response)).error).toContain("un archivo")
    })

    it("rejects multiple files", async () => {
      const response = await detect(buildForm({ extraFiles: [makeFirmware(64)] }))
      expect(response.status).toBe(400)
    })

    it("rejects an empty file", async () => {
      const response = await detect(buildForm({ file: new Uint8Array(0) }))
      expect(response.status).toBe(400)
      expect((await readJson<DetectBody>(response)).error).toContain("vacío")
    })

    it("rejects files that are not .bin", async () => {
      const response = await detect(buildForm({ filename: "firmware.zip" }))
      expect(response.status).toBe(400)
      expect(fakeEngine.detect).not.toHaveBeenCalled()
    })

    it("accepts an uppercase .BIN extension", async () => {
      expect((await detect(buildForm({ filename: "FIRMWARE.BIN" }))).status).toBe(200)
    })

    it("rejects a file one byte over 4 MiB with 413 and accepts exactly 4 MiB", async () => {
      const over = await detect(buildForm({ file: makeFirmware(4 * 1024 * 1024 + 1) }))
      expect(over.status).toBe(413)
      expect(fakeEngine.detect).not.toHaveBeenCalled()

      const exact = await detect(buildForm({ file: makeFirmware(4 * 1024 * 1024) }))
      expect(exact.status).toBe(200)
    })

    it("rejects an oversized Content-Length before reading the body", async () => {
      const request = postRequest(PATH, buildForm(), {
        origin: "http://localhost:3000",
        "content-length": String(6 * 1024 * 1024),
      })
      const response = await POST(request)
      expect(response.status).toBe(413)
    })

    it("rejects a malformed multipart body", async () => {
      const request = postRequest(PATH, "--garbage--not-a-form", {
        origin: "http://localhost:3000",
        "content-type": "multipart/form-data; boundary=xyz",
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
      expect((await readJson<DetectBody>(response)).success).toBe(false)
    })

    it("rejects non-multipart bodies", async () => {
      const request = postRequest(PATH, JSON.stringify({ file: "x" }), {
        origin: "http://localhost:3000",
        "content-type": "application/json",
      })
      expect((await POST(request)).status).toBe(400)
    })

    it("rejects unknown fields (client model, disclaimer) instead of honouring them", async () => {
      const withModel = await detect(buildForm({ fields: { model: "mi6" } }))
      expect(withModel.status).toBe(400)
      const withDisclaimer = await detect(buildForm({ fields: { disclaimerAccepted: "true" } }))
      expect(withDisclaimer.status).toBe(400)
    })
  })

  describe("detection result", () => {
    it("returns diagnostics, selectable patches and the input hash", async () => {
      const bytes = makeFirmware(512)
      const response = await detect(buildForm({ file: bytes }))
      const json = await readJson<DetectBody>(response)

      expect(json.success).toBe(true)
      expect(json.data?.supported).toBe(true)
      expect(json.data?.detection.model).toBe("mi6")
      expect(json.data?.size).toBe(512)
      expect(json.data?.inputSha256).toMatch(/^[0-9a-f]{64}$/)
      expect(json.data?.detection.hits).toEqual(["LEQI tag EU1"])
      expect(json.data?.availablePatches.map((patch) => patch.code)).toEqual(["sls", "sld", "slp", "mss", "mss0exp"])
      expect(fakeEngine.detect).toHaveBeenCalledTimes(1)
      expect(fakeEngine.patch).not.toHaveBeenCalled()
    })

    it("reports a model that was not detected without leaking patches", async () => {
      fakeEngine.detect.mockReturnValue(fakeDetection({ ok: false, model: null, displayName: null, supported: false }))

      const json = await readJson<DetectBody>(await detect())
      expect(json.data?.supported).toBe(false)
      expect(json.data?.message).toBe("No se pudo detectar el modelo del firmware.")
      expect(json.data?.availablePatches).toEqual([])
    })

    it("reports a recognised but unsupported model (non-patchable label)", async () => {
      fakeEngine.detect.mockReturnValue(fakeDetection({ model: "3lite", displayName: "3 Lite", supported: false }))

      const json = await readJson<DetectBody>(await detect())
      expect(json.data?.supported).toBe(false)
      expect(json.data?.message).toContain("no está soportado")
      expect(json.data?.availablePatches).toEqual([])
    })

    it("treats a detected model missing from the matrix as unsupported", async () => {
      fakeEngine.detect.mockReturnValue(fakeDetection({ model: "mi99", supported: true }))
      const json = await readJson<DetectBody>(await detect())
      expect(json.data?.supported).toBe(false)
    })

    it("maps an expected engine rejection to 422 without leaking engine text", async () => {
      fakeEngine.detect.mockImplementation(() => {
        throw new EngineFailure("truncated_input", true)
      })
      const response = await detect()
      expect(response.status).toBe(422)
      expect((await readJson<DetectBody>(response)).error).toBe("No se pudo detectar el modelo del firmware.")
      expect(mocks.captureException).not.toHaveBeenCalled()
    })

    it("maps an unexpected engine error to a generic 500 and reports a sanitized Sentry event", async () => {
      fakeEngine.detect.mockImplementation(() => {
        throw new EngineFailure("engine_error", false)
      })
      const response = await detect()
      expect(response.status).toBe(500)
      expect(mocks.captureException).toHaveBeenCalledTimes(1)
      const [captured, hint] = mocks.captureException.mock.calls[0] as [Error, { tags: Record<string, string> }]
      expect(captured.message).toBe("Firmware detection failure: engine_error")
      expect(hint.tags.feature).toBe("firmware-patcher")
    })

    it("never logs bytes, filenames or hashes", async () => {
      await detect(buildForm({ filename: "secret-name.bin" }))
      const logged = JSON.stringify([
        ...mocks.loggerInfo.mock.calls,
        ...mocks.loggerWarn.mock.calls,
        ...mocks.loggerError.mock.calls,
      ])
      expect(logged).not.toContain("secret-name")
      expect(logged).not.toMatch(/[0-9a-f]{64}/)
      expect(logged).toContain("firmware-patcher")
    })
  })
})
