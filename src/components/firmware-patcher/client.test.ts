import { describe, expect, it } from "vitest"
import {
  classifyError,
  decodePatchLog,
  filenameFromDisposition,
  safeDownloadName,
  sanitizeServerMessage,
} from "./client"

describe("decodePatchLog", () => {
  it("decodes a base64url JSON array", () => {
    const log = [{ name: "sls", offset: 16, before: "1a", after: "23 ñ" }]
    const header = Buffer.from(JSON.stringify(log)).toString("base64url")
    expect(decodePatchLog(header, false)).toEqual({ log, truncated: false, unavailable: false })
  })

  it("reports truncation when the header is omitted by the server", () => {
    expect(decodePatchLog(null, true)).toEqual({ log: [], truncated: true, unavailable: false })
    expect(decodePatchLog(null, false)).toEqual({ log: [], truncated: false, unavailable: true })
  })

  it("never throws on malformed input", () => {
    expect(decodePatchLog("%%%not-base64%%%", false).unavailable).toBe(true)
    expect(decodePatchLog(Buffer.from("{}").toString("base64url"), false).unavailable).toBe(true)
  })
})

describe("filename handling", () => {
  it("uses the Content-Disposition filename", () => {
    expect(filenameFromDisposition('attachment; filename="patched_mi6_stock.bin"', "mi6")).toBe("patched_mi6_stock.bin")
    expect(filenameFromDisposition("attachment; filename*=UTF-8''patched_mi6_a%20b.bin", "mi6")).toBe(
      "patched_mi6_a b.bin"
    )
  })

  it("falls back safely and strips path separators / control characters", () => {
    expect(filenameFromDisposition(null, "mi6")).toBe("patched_mi6.bin")
    expect(filenameFromDisposition(null, "../evil")).toBe("patched_firmware.bin")
    expect(safeDownloadName("..\\..\\x/y\u0000.bin", "f.bin")).not.toMatch(/[\\/\u0000]/)
    expect(safeDownloadName("name", "f.bin")).toBe("name.bin")
    expect(safeDownloadName("a".repeat(500) + ".bin", "f.bin").length).toBeLessThanOrEqual(124)
  })
})

describe("error mapping", () => {
  it("maps HTTP statuses to actionable Spanish copy", () => {
    expect(classifyError(401, "x").kind).toBe("auth")
    expect(classifyError(403, "x").kind).toBe("auth")
    expect(classifyError(404, "x").kind).toBe("disabled")
    expect(classifyError(413, "x").kind).toBe("size")
    expect(classifyError(429, "x").kind).toBe("rate_limit")
    expect(classifyError(500, undefined).kind).toBe("server")
  })

  it("classifies validation failures by message", () => {
    expect(classifyError(400, "Los bytes MSS0 no coinciden").kind).toBe("mss0")
    expect(classifyError(400, "Debés confirmar los parches experimentales").kind).toBe("experimental")
    expect(classifyError(422, "No se encontró la firma para sls").kind).toBe("signature")
    expect(classifyError(400, "No se pudo detectar el modelo").kind).toBe("unsupported")
  })

  it("drops anything that looks like a stack trace or internal path", () => {
    expect(sanitizeServerMessage("TypeError: x\n    at f (C:/a.ts:1:1)")).toBeNull()
    expect(sanitizeServerMessage("Fallo en /repo/src/lib/x.ts")).toBeNull()
    expect(sanitizeServerMessage("a".repeat(300))).toBeNull()
    expect(sanitizeServerMessage("Mensaje claro")).toBe("Mensaje claro")
  })
})
