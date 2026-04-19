import { describe, expect, it } from "vitest"

import { GET } from "@/app/api/payments/route"

describe("/api/payments", () => {
  it("points callers at the concrete payment routes", async () => {
    const response = GET()
    const json = (await response.json()) as { message: string }

    expect(response.status).toBe(200)
    expect(json.message).toContain("/api/payments/initiate")
    expect(json.message).toContain("/api/payments/webhook")
  })
})
