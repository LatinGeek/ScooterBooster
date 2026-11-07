import crypto from "crypto"
import fs from "fs"
import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  addAuditLogEntry: vi.fn(),
  captureException: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/session", () => ({ getSession: mocks.getSession }))
vi.mock("@/lib/db/audit-log", () => ({ addAuditLogEntry: mocks.addAuditLogEntry }))
vi.mock("@sentry/nextjs", () => ({ captureException: mocks.captureException }))
vi.mock("@/lib/logger", () => ({
  default: { info: mocks.loggerInfo, warn: mocks.loggerWarn, error: mocks.loggerError },
}))
vi.mock("@/lib/firmware-patcher/server/engine", async () => {
  const support = await import("@/lib/firmware-patcher/server/test-support")
  return { firmwareEngine: support.fakeEngine }
})

import { POST, dynamic, maxDuration, runtime } from "@/app/api/admin/firmware-patcher/patch/route"
import { resetLocalRateLimits, enforceRateLimit } from "@/lib/ratelimit"
import { EngineFailure } from "@/lib/firmware-patcher/server/contract"
import {
  buildForm,
  enableFlags,
  fakeDetection,
  fakeEngine,
  makeFirmware,
  ORIGIN,
  patchFields,
  postRequest,
  readJson,
  resetFakeEngine,
  type FormOptions,
} from "@/lib/firmware-patcher/server/test-support"

const PATH = "/api/admin/firmware-patcher/patch"

function patch(options: FormOptions = {}, headers?: Record<string, string>) {
  const fields = options.fields ?? patchFields([{ code: "sls", value: 30 }])
  return POST(postRequest(PATH, buildForm({ ...options, fields }), headers))
}

function sha(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex")
}

type ErrorBody = { success: boolean; error?: string }

function auditCalls() {
  return mocks.addAuditLogEntry.mock.calls.map(
    ([entry]) => entry as { action: string; actorUid: string; targetType: string; targetId: string | null; metadata: Record<string, unknown> },
  )
}

describe("POST /api/admin/firmware-patcher/patch", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetFakeEngine()
    resetLocalRateLimits()
    enableFlags(true)
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    globalThis.__sbFirmwarePatchInFlight = 0
    mocks.getSession.mockResolvedValue({ uid: "tech-1", role: "technician" })
    mocks.addAuditLogEntry.mockResolvedValue({ id: "audit-1" })
  })

  it("declares the node runtime, dynamic rendering and a 10 s budget", () => {
    expect(runtime).toBe("nodejs")
    expect(dynamic).toBe("force-dynamic")
    expect(maxDuration).toBe(10)
  })

  describe("access", () => {
    it("returns 404 before auth when the flag is off and writes nothing", async () => {
      enableFlags(false)
      mocks.getSession.mockResolvedValue(null)
      const response = await patch()
      expect(response.status).toBe(404)
      expect(mocks.getSession).not.toHaveBeenCalled()
      expect(mocks.addAuditLogEntry).not.toHaveBeenCalled()
    })

    it("rejects a missing or foreign Origin with 403", async () => {
      expect((await patch({}, { origin: "https://evil.example" })).status).toBe(403)
      expect(fakeEngine.patch).not.toHaveBeenCalled()
    })

    it("returns 401 for anonymous and 403 for the user role, without auditing", async () => {
      mocks.getSession.mockResolvedValue(null)
      expect((await patch()).status).toBe(401)
      mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })
      expect((await patch()).status).toBe(403)
      expect(fakeEngine.patch).not.toHaveBeenCalled()
      expect(mocks.addAuditLogEntry).not.toHaveBeenCalled()
    })

    it.each(["admin", "technician"] as const)("allows %s to patch", async (role) => {
      mocks.getSession.mockResolvedValue({ uid: `${role}-1`, role })
      const response = await patch()
      expect(response.status).toBe(200)
      expect(auditCalls()[0]?.metadata.role).toBe(role)
    })
  })

  describe("successful response", () => {
    it("returns the patched binary with the contracted headers", async () => {
      const input = makeFirmware(1024)
      const response = await patch({ file: input, filename: "My Scooter v1.bin" })

      expect(response.status).toBe(200)
      const output = new Uint8Array(await response.arrayBuffer())
      expect(output).toEqual(Uint8Array.from(input, (byte) => (byte ^ 0x5a) & 0xff))

      expect(response.headers.get("content-type")).toBe("application/octet-stream")
      expect(response.headers.get("content-disposition")).toBe('attachment; filename="patched_mi6_My_Scooter_v1.bin"')
      expect(response.headers.get("content-length")).toBe(String(output.byteLength))
      expect(response.headers.get("cache-control")).toBe("no-store")
      expect(response.headers.get("x-content-type-options")).toBe("nosniff")
      expect(response.headers.get("x-firmware-model")).toBe("mi6")
      expect(response.headers.get("x-firmware-input-sha256")).toBe(sha(input))
      expect(response.headers.get("x-firmware-output-sha256")).toBe(sha(output))
      expect(response.headers.get("x-firmware-input-size")).toBe("1024")
      expect(response.headers.get("x-firmware-output-size")).toBe("1024")
      expect(response.headers.get("x-request-id")).toBeTruthy()

      const log = JSON.parse(Buffer.from(response.headers.get("x-firmware-patch-log") ?? "", "base64url").toString("utf8"))
      expect(log).toEqual([{ name: "sls", offset: 4096, before: "00ff", after: "00fa" }])
      expect(response.headers.get("x-firmware-patch-log-truncated")).toBeNull()
    })

    it("omits an oversized patch log and flags the truncation", async () => {
      fakeEngine.patch.mockImplementation((input, model) => ({
        data: input,
        model,
        log: Array.from({ length: 120 }, (_, index) => ({ name: `patch-${index}`, offset: index, before: "aa".repeat(8), after: "bb".repeat(8) })),
      }))
      const response = await patch()
      expect(response.status).toBe(200)
      expect(response.headers.get("x-firmware-patch-log")).toBeNull()
      expect(response.headers.get("x-firmware-patch-log-truncated")).toBe("1")
    })

    it("sanitizes hostile filenames in Content-Disposition", async () => {
      const response = await patch({ filename: '..\\..\\etc/pa"ss\r\nwd<script>.bin' })
      const disposition = response.headers.get("content-disposition") ?? ""
      expect(disposition).toMatch(/^attachment; filename="patched_mi6_[A-Za-z0-9._-]+\.bin"$/)
      expect(disposition).not.toMatch(/[<>\r\n\\]/)
      expect(disposition.slice('attachment; filename="'.length, -1)).not.toContain('"')
    })

    it("is deterministic for the same input and options", async () => {
      const input = makeFirmware(300)
      const first = await patch({ file: input })
      const second = await patch({ file: input })
      expect(first.headers.get("x-firmware-output-sha256")).toBe(second.headers.get("x-firmware-output-sha256"))
    })
  })

  describe("server-side detection and the engine call", () => {
    it("ignores a model passed in the query string and uses the detected one", async () => {
      const request = postRequest(`${PATH}?model=mi4`, buildForm({ fields: patchFields([{ code: "sls", value: 30 }]) }))
      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(fakeEngine.patch.mock.calls[0]?.[1]).toBe("mi6")
    })

    it("rejects a client-supplied model or disclaimer field", async () => {
      expect((await patch({ fields: patchFields([{ code: "sls", value: 30 }], { model: "mi4" }) })).status).toBe(400)
      expect(
        (await patch({ fields: patchFields([{ code: "sls", value: 30 }], { disclaimerVersion: "1" }) })).status,
      ).toBe(400)
      expect(fakeEngine.patch).not.toHaveBeenCalled()
    })

    it("passes patches to the engine in canonical order regardless of client order", async () => {
      const selection = [
        { code: "mss", value: 4 },
        { code: "slp", value: 6 },
        { code: "sld", value: 20 },
        { code: "sls", value: 30 },
      ]
      const response = await patch({ fields: patchFields(selection, { allowExperimental: "true" }) })
      expect(response.status).toBe(200)
      const passed = fakeEngine.patch.mock.calls[0]?.[2]
      expect(passed?.map((entry) => entry.code)).toEqual(["sls", "sld", "slp", "mss"])
      expect(passed?.some((entry) => ["chk", "img"].includes(entry.code))).toBe(false)
    })

    it("returns 422 and audits a rejection when the model is not detected", async () => {
      fakeEngine.detect.mockReturnValue(fakeDetection({ ok: false, model: null, supported: false }))
      const response = await patch()
      expect(response.status).toBe(422)
      expect((await readJson<ErrorBody>(response)).error).toBe("No se pudo detectar el modelo del firmware.")
      expect(fakeEngine.patch).not.toHaveBeenCalled()
      expect(auditCalls()[0]).toMatchObject({ action: "firmware_patch_rejected", metadata: { reason: "model_undetected" } })
    })

    it("returns 422 for a detected but unsupported/non-patchable model", async () => {
      fakeEngine.detect.mockReturnValue(fakeDetection({ model: "3lite", supported: false }))
      const response = await patch()
      expect(response.status).toBe(422)
      expect(fakeEngine.patch).not.toHaveBeenCalled()
      expect(auditCalls()[0]?.metadata).toMatchObject({ reason: "model_unsupported", model: "3lite" })
    })
  })

  describe("selection validation", () => {
    async function expectRejected(fields: Record<string, string>, reason: string, status = 400) {
      const response = await patch({ fields })
      expect(response.status).toBe(status)
      expect((await readJson<ErrorBody>(response)).success).toBe(false)
      expect(fakeEngine.patch).not.toHaveBeenCalled()
      expect(auditCalls().at(-1)).toMatchObject({ action: "firmware_patch_rejected", metadata: { reason } })
    }

    it("rejects an unknown patch code", () =>
      expectRejected(patchFields([{ code: "rfm", value: true }]), "invalid_selection"))

    it("rejects server-managed chk and img", async () => {
      await expectRejected(patchFields([{ code: "chk", value: true }]), "invalid_selection")
      await expectRejected(patchFields([{ code: "img", value: true }]), "invalid_selection")
    })

    it("rejects duplicate codes", () =>
      expectRejected(patchFields([{ code: "sls", value: 20 }, { code: "sls", value: 21 }]), "invalid_selection"))

    it("rejects patches that do not apply to the detected model", async () => {
      fakeEngine.detect.mockReturnValue(fakeDetection({ model: "mi4", displayName: "Electric Scooter 4", family: "lks32" }))
      await expectRejected(patchFields([{ code: "slp", value: 6 }]), "invalid_selection")
      await expectRejected(patchFields([{ code: "mss0exp", value: true }], { allowExperimental: "true" }), "invalid_selection")
    })

    it("rejects out-of-range numbers without clamping", async () => {
      await expectRejected(patchFields([{ code: "sls", value: 35.1 }]), "invalid_selection")
      await expectRejected(patchFields([{ code: "sls", value: 0.9 }]), "invalid_selection")
      await expectRejected(patchFields([{ code: "sls", value: "30" }]), "invalid_selection")
    })

    it("rejects values off the step grid but accepts decimals on it", async () => {
      await expectRejected(patchFields([{ code: "sls", value: 25.05 }]), "invalid_selection")
      expect((await patch({ fields: patchFields([{ code: "sls", value: 25.1 }]) })).status).toBe(200)
    })

    it("validates fdv as exactly four digits", async () => {
      fakeEngine.detect.mockReturnValue(fakeDetection({ model: "mi4", displayName: "Electric Scooter 4", family: "lks32" }))
      await expectRejected(patchFields([{ code: "fdv", value: "123" }]), "invalid_selection")
      await expectRejected(patchFields([{ code: "fdv", value: "12a4" }]), "invalid_selection")
      expect((await patch({ fields: patchFields([{ code: "fdv", value: "0042" }]) })).status).toBe(200)
    })

    it("requires true for boolean patches", async () => {
      fakeEngine.detect.mockReturnValue(fakeDetection({ model: "mi4", displayName: "Electric Scooter 4", family: "lks32" }))
      await expectRejected(patchFields([{ code: "cce", value: false }]), "invalid_selection")
      await expectRejected(patchFields([{ code: "cce", value: "true" }]), "invalid_selection")
    })

    it("rejects more than 8 entries, empty, missing and malformed selections", async () => {
      const nine = Array.from({ length: 9 }, () => ({ code: "sls", value: 20 }))
      await expectRejected(patchFields(nine), "invalid_selection")
      await expectRejected(patchFields([]), "invalid_selection")
      await expectRejected({}, "invalid_selection")
      await expectRejected({ selection: "{not json" }, "invalid_selection")
      await expectRejected(patchFields({ code: "sls" }), "invalid_selection")
      await expectRejected(patchFields([{ code: "sls", value: 20, extra: 1 }]), "invalid_selection")
    })

    it("parses allowExperimental and fullDump strictly", async () => {
      for (const bad of ["1", "yes", "TRUE", "on", ""]) {
        await expectRejected(patchFields([{ code: "sls", value: 30 }], { allowExperimental: bad }), "invalid_upload")
        await expectRejected(patchFields([{ code: "sls", value: 30 }], { fullDump: bad }), "invalid_upload")
      }
    })
  })

  describe("experimental patches (FP-007)", () => {
    it.each(["admin", "technician"] as const)("requires explicit acknowledgment for %s", async (role) => {
      mocks.getSession.mockResolvedValue({ uid: `${role}-1`, role })
      const selection = [{ code: "mss", value: 4 }]

      const denied = await patch({ fields: patchFields(selection) })
      expect(denied.status).toBe(400)
      expect(fakeEngine.patch).not.toHaveBeenCalled()
      expect(auditCalls()[0]).toMatchObject({
        action: "firmware_patch_rejected",
        metadata: { reason: "experimental_not_acknowledged" },
      })

      const falseFlag = await patch({ fields: patchFields(selection, { allowExperimental: "false" }) })
      expect(falseFlag.status).toBe(400)

      const allowed = await patch({ fields: patchFields(selection, { allowExperimental: "true" }) })
      expect(allowed.status).toBe(200)
      expect(fakeEngine.patch.mock.calls[0]?.[3]).toEqual({ allowExperimental: true, fullDump: false })
      expect(auditCalls().at(-1)).toMatchObject({
        action: "firmware_patch_applied",
        metadata: { experimental: true, role },
      })
    })

    it("does not let a query parameter enable experimental patches", async () => {
      const request = postRequest(
        `${PATH}?allowExperimental=true`,
        buildForm({ fields: patchFields([{ code: "mss", value: 4 }]) }),
      )
      expect((await POST(request)).status).toBe(400)
    })

    it("marks non-experimental selections as experimental: false", async () => {
      await patch()
      expect(auditCalls()[0]?.metadata.experimental).toBe(false)
    })
  })

  describe("MSS0 experiment (FP-019)", () => {
    it("requires acknowledgment and supersedes any client mss value", async () => {
      const selection = [
        { code: "mss", value: 7 },
        { code: "mss0exp", value: true },
        { code: "sls", value: 35 },
      ]
      const denied = await patch({ fields: patchFields(selection) })
      expect(denied.status).toBe(400)

      const response = await patch({ fields: patchFields(selection, { allowExperimental: "true" }) })
      expect(response.status).toBe(200)
      expect(fakeEngine.patch.mock.calls[0]?.[2]).toEqual([
        { code: "sls", value: 35 },
        { code: "mss0exp", value: true },
      ])
      expect(auditCalls().at(-1)?.metadata).toMatchObject({
        mss0exp: true,
        experimental: true,
        patches: ["sls", "mss0exp"],
      })
    })

    it("treats mss0exp as boolean only", async () => {
      const response = await patch({
        fields: patchFields([{ code: "mss0exp", value: 5 }], { allowExperimental: "true" }),
      })
      expect(response.status).toBe(400)
    })

    it("works for both roles", async () => {
      for (const role of ["admin", "technician"] as const) {
        mocks.getSession.mockResolvedValue({ uid: `${role}-9`, role })
        const response = await patch({
          fields: patchFields([{ code: "mss0exp", value: true }], { allowExperimental: "true" }),
        })
        expect(response.status).toBe(200)
      }
    })
  })

  describe("full dump (FP-008)", () => {
    it("forwards fullDump to the engine and audits it", async () => {
      const normal = await patch()
      expect(normal.status).toBe(200)
      expect(fakeEngine.patch.mock.calls[0]?.[3]).toEqual({ allowExperimental: false, fullDump: false })
      expect(auditCalls().at(-1)?.metadata.fullDump).toBe(false)

      const full = await patch({ fields: patchFields([{ code: "sls", value: 30 }], { fullDump: "true" }) })
      expect(full.status).toBe(200)
      expect(fakeEngine.patch.mock.calls[1]?.[3]).toEqual({ allowExperimental: false, fullDump: true })
      expect(auditCalls().at(-1)?.metadata.fullDump).toBe(true)
    })

    it("never lets the client request chk/img to emulate full dump", async () => {
      const response = await patch({
        fields: patchFields([{ code: "sls", value: 30 }, { code: "chk", value: true }], { fullDump: "true" }),
      })
      expect(response.status).toBe(400)
    })
  })

  describe("upload limits", () => {
    it("returns 413 for oversized files and audits file_too_large", async () => {
      const response = await patch({ file: makeFirmware(4 * 1024 * 1024 + 1) })
      expect(response.status).toBe(413)
      expect(fakeEngine.detect).not.toHaveBeenCalled()
      expect(auditCalls()[0]).toMatchObject({ action: "firmware_patch_rejected", metadata: { reason: "file_too_large" } })
    })

    it("rejects empty files, extra files and malformed multipart", async () => {
      expect((await patch({ file: new Uint8Array(0) })).status).toBe(400)
      expect((await patch({ extraFiles: [makeFirmware(32)] })).status).toBe(400)
      const malformed = postRequest(PATH, "garbage", { origin: ORIGIN, "content-type": "multipart/form-data; boundary=zz" })
      expect((await POST(malformed)).status).toBe(400)
    })

    it("rejects too many concurrent operations before reading the body", async () => {
      globalThis.__sbFirmwarePatchInFlight = 4
      const response = await patch()
      expect(response.status).toBe(429)
      expect(fakeEngine.detect).not.toHaveBeenCalled()
    })

    it("releases the concurrency slot after success and failure", async () => {
      await patch()
      await patch({ file: new Uint8Array(0) })
      expect(globalThis.__sbFirmwarePatchInFlight).toBe(0)
    })

    it("returns 500 and audits a failure when the output exceeds 8 MiB", async () => {
      fakeEngine.patch.mockReturnValue({ data: new Uint8Array(8 * 1024 * 1024 + 1), log: [], model: "mi6" })
      const response = await patch()
      expect(response.status).toBe(500)
      expect(response.headers.get("content-type")).not.toBe("application/octet-stream")
      expect(auditCalls()[0]).toMatchObject({ action: "firmware_patch_failed", metadata: { reason: "output_too_large" } })
    })
  })

  describe("rate limits (FP-011)", () => {
    it("allows 10 requests per minute and then returns 429 before touching the body", async () => {
      for (let index = 0; index < 10; index += 1) {
        expect((await patch()).status).toBe(200)
      }
      fakeEngine.detect.mockClear()
      const blocked = await patch()
      expect(blocked.status).toBe(429)
      expect((await readJson<ErrorBody>(blocked)).error).toContain("Demasiadas solicitudes")
      expect(fakeEngine.detect).not.toHaveBeenCalled()

      mocks.getSession.mockResolvedValue({ uid: "tech-2", role: "technician" })
      expect((await patch()).status).toBe(200)
    })

    it("enforces the 100/day policy per user", async () => {
      for (let index = 0; index < 100; index += 1) {
        await enforceRateLimit("firmwarePatchDaily", "tech-1")
      }
      const blocked = await patch()
      expect(blocked.status).toBe(429)
      expect(fakeEngine.detect).not.toHaveBeenCalled()
    })
  })

  describe("engine failures (all-or-nothing)", () => {
    it("returns 422 with no binary when the engine rejects, and audits firmware_patch_failed", async () => {
      fakeEngine.patch.mockImplementation(() => {
        throw new EngineFailure("pattern_not_found", true)
      })
      const response = await patch()
      expect(response.status).toBe(422)
      expect(response.headers.get("content-type")).toContain("application/json")
      expect(response.headers.get("x-firmware-output-sha256")).toBeNull()
      expect(auditCalls()[0]).toMatchObject({ action: "firmware_patch_failed", metadata: { reason: "engine_rejected" } })
      expect(mocks.captureException).not.toHaveBeenCalled()
    })

    it("returns 500, reports a sanitized Sentry event and never forwards the raw engine error", async () => {
      fakeEngine.patch.mockImplementation(() => {
        throw new Error("boom: bytes deadbeef at offset 12")
      })
      const response = await patch()
      expect(response.status).toBe(500)
      expect((await readJson<ErrorBody>(response)).error).not.toContain("deadbeef")
      expect(auditCalls()[0]).toMatchObject({ action: "firmware_patch_failed", metadata: { reason: "engine_error" } })
      expect(JSON.stringify(mocks.captureException.mock.calls)).not.toContain("deadbeef")
      expect(JSON.stringify(mocks.loggerError.mock.calls)).not.toContain("deadbeef")
    })
  })

  describe("audit (FP-010, D5)", () => {
    it("records metadata with hashes and sizes only", async () => {
      const input = makeFirmware(777)
      const response = await patch({
        file: input,
        filename: "customer-name.bin",
        fields: patchFields([{ code: "sls", value: 30 }, { code: "sld", value: 20 }]),
      })
      const output = new Uint8Array(await response.arrayBuffer())

      expect(mocks.addAuditLogEntry).toHaveBeenCalledTimes(1)
      const entry = auditCalls()[0]
      expect(entry).toMatchObject({
        action: "firmware_patch_applied",
        actorUid: "tech-1",
        targetType: "firmware",
        targetId: sha(input),
      })
      expect(entry?.metadata).toMatchObject({
        model: "mi6",
        family: "n32",
        container: "leqi-eu1",
        patches: ["sls", "sld"],
        values: { sls: 30, sld: 20 },
        experimental: false,
        fullDump: false,
        mss0exp: false,
        inputSha256: sha(input),
        outputSha256: sha(output),
        inputSize: 777,
        outputSize: 777,
      })
      expect(typeof entry?.metadata.durationMs).toBe("number")

      const serialized = JSON.stringify(entry)
      expect(serialized).not.toContain("customer-name")
      expect(serialized).not.toContain(Buffer.from(input).toString("base64").slice(0, 40))
      for (const value of Object.values(entry?.metadata ?? {})) {
        expect(value instanceof Uint8Array || Buffer.isBuffer(value)).toBe(false)
      }
    })

    it("fails closed: no binary when the success audit write fails", async () => {
      mocks.addAuditLogEntry.mockRejectedValue(new Error("firestore unavailable"))
      const response = await patch()
      expect(response.status).toBe(503)
      expect(response.headers.get("content-type")).toContain("application/json")
      expect(response.headers.get("x-firmware-output-sha256")).toBeNull()
      expect((await readJson<ErrorBody>(response)).error).toContain("auditoría")
      expect(mocks.addAuditLogEntry).toHaveBeenCalledTimes(1)
    })

    it("still returns the original 4xx when auditing a rejection fails", async () => {
      mocks.addAuditLogEntry.mockRejectedValue(new Error("firestore unavailable"))
      const response = await patch({ fields: patchFields([{ code: "nope", value: 1 }]) })
      expect(response.status).toBe(400)
    })

    it("does not audit anonymous, forbidden, flag-off or rate-limited requests", async () => {
      mocks.getSession.mockResolvedValue(null)
      await patch()
      mocks.getSession.mockResolvedValue({ uid: "user-1", role: "user" })
      await patch()
      enableFlags(false)
      await patch()
      expect(mocks.addAuditLogEntry).not.toHaveBeenCalled()
    })

    it("logs only safe structured fields", async () => {
      await patch({ filename: "customer-name.bin" })
      const logged = JSON.stringify([
        ...mocks.loggerInfo.mock.calls,
        ...mocks.loggerWarn.mock.calls,
        ...mocks.loggerError.mock.calls,
      ])
      expect(logged).not.toContain("customer-name")
      expect(logged).not.toMatch(/[0-9a-f]{64}/)
      expect(logged).toContain('"outcome":"applied"')
    })
  })

  describe("no persistence, no network, no disclaimer (G6, FP-009)", () => {
    const roots = [
      path.join(process.cwd(), "src", "app", "api", "admin", "firmware-patcher"),
      path.join(process.cwd(), "src", "lib", "firmware-patcher", "server"),
    ]

    function sourceFiles(dir: string): string[] {
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) return sourceFiles(full)
        return /\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) && entry.name !== "test-support.ts"
          ? [full]
          : []
      })
    }

    it("never imports filesystem, network, storage or browser-storage APIs", () => {
      const forbidden =
        /from\s+["'](node:)?(fs|fs\/promises|child_process|http|https|net|dns)["']|\bfetch\(|firebase-admin\/storage|adminStorage|localStorage|sessionStorage|writeFile|createWriteStream/
      const files = roots.flatMap(sourceFiles)
      expect(files.length).toBeGreaterThan(5)
      for (const file of files) {
        expect(fs.readFileSync(file, "utf8"), file).not.toMatch(forbidden)
      }
    })

    it("has no disclaimer concept anywhere in the API surface", () => {
      for (const file of roots.flatMap(sourceFiles)) {
        expect(fs.readFileSync(file, "utf8").toLowerCase(), file).not.toContain("disclaimer")
      }
    })
  })
})
