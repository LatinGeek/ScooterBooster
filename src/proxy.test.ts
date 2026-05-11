import { NextRequest } from "next/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/session", () => ({
  SESSION_COOKIE_NAME: "__session",
}))

import { proxy } from "@/proxy"

function getLocationHeader(response: Response) {
  const location = response.headers.get("location")
  if (!location) throw new Error("Expected redirect response to include a location header")
  return new URL(location, "http://localhost:3000")
}

describe("proxy", () => {
  it("redirects unauthenticated booking starts to login with the full return URL", async () => {
    const request = new NextRequest(
      "http://localhost:3000/booking/new?service=service-1&model=model-2&step=3"
    )

    const response = await proxy(request)
    const location = getLocationHeader(response)

    expect(response.status).toBe(307)
    expect(location.pathname).toBe("/login")
    expect(location.searchParams.get("redirect")).toBe(
      "/booking/new?service=service-1&model=model-2&step=3"
    )
  })

  it("allows authenticated users through protected booking routes", async () => {
    const request = new NextRequest("http://localhost:3000/booking/new?step=1", {
      headers: {
        Cookie: "__session=session-cookie-value",
      },
    })

    const response = await proxy(request)

    expect(response.headers.get("location")).toBeNull()
    expect(response.status).toBe(200)
  })
})
