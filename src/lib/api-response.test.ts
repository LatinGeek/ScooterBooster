import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ValidationError } from "./errors"

const mocks = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock("./logger", () => ({
  default: {
    info: mocks.info,
    warn: mocks.warn,
    error: mocks.error,
  },
}))

import { withErrorHandling } from "./api-response"

describe("withErrorHandling", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("logs successful API requests and adds an x-request-id header", async () => {
    const handler = withErrorHandling(async (_request: NextRequest) =>
      NextResponse.json({ success: true, data: { ok: true } }, { status: 200 }),
    )
    const request = new NextRequest("http://localhost:3000/api/health", {
      method: "GET",
      headers: {
        "x-request-id": "req-123",
      },
    })

    const response = await handler(request)

    expect(response.headers.get("x-request-id")).toBe("req-123")
    expect(mocks.info).toHaveBeenCalledWith(
      expect.objectContaining({
        route: "/api/health",
        method: "GET",
        status: 200,
        requestId: "req-123",
      }),
      "API request completed",
    )
  })

  it("adds request IDs to handled errors too", async () => {
    const handler = withErrorHandling(async (_request: NextRequest) => {
      throw new ValidationError("Dato inválido")
    })
    const request = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: {
        Origin: "http://localhost:3000",
      },
    })

    const response = await handler(request)
    const body = (await response.json()) as { success: boolean; error: string }

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(response.headers.get("x-request-id")).toBeTruthy()
    expect(mocks.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        route: "/api/bookings",
        method: "POST",
        status: 400,
        requestId: expect.any(String),
      }),
      "API request failed with handled error",
    )
  })
})
