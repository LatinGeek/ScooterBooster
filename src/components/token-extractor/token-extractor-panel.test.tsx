// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TokenExtractorPanel } from "./token-extractor-panel"

describe("TokenExtractorPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              authenticated: false,
              userId: null,
              role: "admin",
              servers: ["cn", "de", "us", "ru", "tw", "sg", "in", "i2"],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    )
  })

  it("renders the staff-only Xiaomi login gate", async () => {
    render(<TokenExtractorPanel />)
    expect(await screen.findByText("Conectar con Xiaomi Cloud")).toBeTruthy()
    expect(screen.getByText("Solo técnicos / admin")).toBeTruthy()
    expect(screen.getByRole("tab", { name: /Código QR/i })).toBeTruthy()
  })

  it.each([
    { status: "cloud_rejected", code: -1, expected: "Xiaomi rechazó la consulta (código -1)" },
    { status: "not_returned", code: 0, expected: "Xiaomi no devolvió una LTMK" },
    { status: "decrypt_error", code: 0, expected: "No se pudo descifrar la clave" },
    { status: "pin_required", code: 0, expected: "Clave cifrada por Xiaomi" },
  ])("shows the LTMK diagnostic after scanning: $status", async ({ status, code, expected }) => {
    const device = {
      server: "tw", did: "1234567890", model: "xiaomi.scooter.6", name: "Fixture scooter",
      mac: "00:11:22:33:44:55", localip: "", token: "", bleKey: "11".repeat(16),
      ltmk: null, ltmkEncrypted: null, ltmkStatus: status, ltmkDiagnostic: { cloudCode: code },
    }
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => {
      const data = url.endsWith("/session")
        ? { authenticated: true, userId: "fixture-owner", role: "technician", servers: ["tw"] }
        : { servers: [{ server: "tw", homes: [], devices: [device], errors: [], homeCount: 1 }],
            devices: [device], totalDevices: 1 }
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200, headers: { "content-type": "application/json" },
      })
    }))
    render(<TokenExtractorPanel />)
    fireEvent.click(await screen.findByRole("button", { name: "Escanear regiones" }))
    expect(await screen.findByText(expected)).toBeTruthy()
    expect(screen.queryByText(device.bleKey)).toBeNull()
    expect(screen.queryByText("PIN incorrecto")).toBeNull()
    const calls = vi.mocked(fetch).mock.calls
    const scanCall = calls.find(([url]) => String(url).endsWith("/scan"))
    expect(JSON.parse(String(scanCall?.[1]?.body))).not.toHaveProperty("pin")
  })
})
