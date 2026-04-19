import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AppError } from "@/lib/errors"
import { enforceIpRateLimit, enforceRateLimit, getRequestIp, resetLocalRateLimits } from "@/lib/ratelimit"

describe("ratelimit fallback", () => {
  const originalUrl = process.env.UPSTASH_REDIS_REST_URL
  const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    resetLocalRateLimits()
  })

  afterEach(() => {
    resetLocalRateLimits()

    if (originalUrl === undefined) {
      delete process.env.UPSTASH_REDIS_REST_URL
    } else {
      process.env.UPSTASH_REDIS_REST_URL = originalUrl
    }

    if (originalToken === undefined) {
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    } else {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalToken
    }
  })

  it("uses the forwarded IP as the identifier for auth limits", () => {
    const request = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      },
    })

    expect(getRequestIp(request)).toBe("203.0.113.10")
  })

  it("blocks auth requests after the configured limit", async () => {
    const request = new NextRequest("http://localhost:3000/api/auth/session", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    })

    for (let index = 0; index < 10; index += 1) {
      await expect(enforceIpRateLimit("authIp", request)).resolves.toMatchObject({
        success: true,
        limit: 10,
      })
    }

    await expect(enforceIpRateLimit("authIp", request)).rejects.toThrowError(AppError)
  })

  it("skips auth IP limits for loopback requests used in local browser flows", async () => {
    const request = new NextRequest("http://127.0.0.1:3000/api/auth/session", {
      method: "POST",
    })

    for (let index = 0; index < 25; index += 1) {
      await expect(enforceIpRateLimit("authIp", request)).resolves.toMatchObject({
        success: true,
        limit: 10,
      })
    }
  })

  it("blocks reviews after the configured per-user daily limit", async () => {
    for (let index = 0; index < 10; index += 1) {
      await expect(enforceRateLimit("reviewUser", "user-123")).resolves.toMatchObject({
        success: true,
        limit: 10,
      })
    }

    await expect(enforceRateLimit("reviewUser", "user-123")).rejects.toThrow(
      "Rate limit exceeded for reviewUser:user-123"
    )
  })
})
