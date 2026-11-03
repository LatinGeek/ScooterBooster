// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
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
})
