/**
 * Test-only helpers for the firmware patcher API routes. Never imported by production code.
 * The fake engine stands in for the W1/W2 modules (see ./engine.ts).
 */
import { NextRequest } from "next/server"
import { vi } from "vitest"
import type { CapabilitiesView, DetectionView, FirmwareEngine, PatchOutcome } from "./contract"

export const ORIGIN = "http://localhost:3000"

export function fakeCapabilities(): CapabilitiesView {
  const speed = (code: string, def: number) => ({
    code,
    status: "supported" as const,
    kind: "number" as const,
    min: 1,
    max: 35,
    step: 0.1,
    default: def,
  })
  return {
    upstream: { version: "1.1.6", commit: "95a8f339787a1fb6486554d61b573b8e2b688c53" },
    models: [
      {
        model: "mi6",
        displayName: "Mi 6",
        family: "n32",
        patches: [
          speed("sls", 25),
          speed("sld", 15),
          speed("slp", 6),
          { code: "dms", status: "unsupported", kind: "number" },
          { code: "fdv", status: "unsupported", kind: "version" },
          { code: "cce", status: "unsupported", kind: "boolean" },
          { code: "mss", status: "experimental", kind: "number", min: 1, max: 9, step: 0.1, default: 5 },
          { code: "mss0exp", status: "experimental", kind: "boolean", default: false },
        ],
      },
      {
        model: "mi4",
        displayName: "Electric Scooter 4",
        family: "lks32",
        patches: [
          speed("sls", 25),
          speed("sld", 15),
          { code: "slp", status: "unsupported", kind: "number" },
          { code: "dms", status: "supported", kind: "number", min: 1, max: 29.6, step: 0.1, default: 22 },
          { code: "fdv", status: "supported", kind: "version", default: "0000" },
          { code: "cce", status: "supported", kind: "boolean", default: false },
          { code: "mss", status: "unsupported", kind: "number" },
          { code: "mss0exp", status: "unsupported", kind: "boolean" },
        ],
      },
    ],
  }
}

export function fakeDetection(overrides: Partial<DetectionView> = {}): DetectionView {
  return {
    ok: true,
    model: "mi6",
    displayName: "Mi 6",
    family: "n32",
    container: "leqi-eu1",
    score: 120,
    hits: ["LEQI tag EU1"],
    notes: [],
    supported: true,
    ...overrides,
  }
}

export const fakeEngine = {
  capabilities: vi.fn<FirmwareEngine["capabilities"]>(),
  detect: vi.fn<FirmwareEngine["detect"]>(),
  patch: vi.fn<FirmwareEngine["patch"]>(),
}

export function resetFakeEngine(): void {
  fakeEngine.capabilities.mockReset().mockImplementation(fakeCapabilities)
  fakeEngine.detect.mockReset().mockImplementation(() => fakeDetection())
  fakeEngine.patch.mockReset().mockImplementation(
    (input, model): PatchOutcome => ({
      data: Uint8Array.from(input, (byte) => (byte ^ 0x5a) & 0xff),
      model,
      log: [{ name: "sls", offset: 4096, before: "00ff", after: "00fa" }],
    }),
  )
}

export function enableFlags(on: boolean): void {
  const value = on ? "true" : "false"
  process.env.FIRMWARE_PATCHER_ENABLED = value
  process.env.NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED = value
}

export function makeFirmware(size = 2048, seed = 7): Uint8Array {
  const bytes = new Uint8Array(size)
  for (let index = 0; index < size; index += 1) bytes[index] = (index * 31 + seed) & 0xff
  return bytes
}

export interface FormOptions {
  file?: Uint8Array | null
  filename?: string
  extraFiles?: Uint8Array[]
  fields?: Record<string, string>
}

export function buildForm(options: FormOptions = {}): FormData {
  const form = new FormData()
  const file = options.file === undefined ? makeFirmware() : options.file
  if (file) {
    form.append("file", new File([file as BlobPart], options.filename ?? "scooter.bin"))
  }
  for (const extra of options.extraFiles ?? []) {
    form.append("file", new File([extra as BlobPart], "second.bin"))
  }
  for (const [key, value] of Object.entries(options.fields ?? {})) {
    form.append(key, value)
  }
  return form
}

export function postRequest(
  path: string,
  body: BodyInit | null,
  headers: Record<string, string> = { origin: ORIGIN },
): NextRequest {
  return new NextRequest(`${ORIGIN}${path}`, { method: "POST", body, headers })
}

export function patchFields(selection: unknown, extra: Record<string, string> = {}): Record<string, string> {
  return { selection: JSON.stringify(selection), ...extra }
}

export async function readJson<T = { success: boolean; data?: unknown; error?: string }>(
  response: Response,
): Promise<T> {
  return (await response.json()) as T
}
