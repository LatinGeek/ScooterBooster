import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AppError } from "@/lib/errors"
import { assertTrustedOrigin, getTrustedOrigins } from "@/lib/security"

describe("security origin checks", () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://scooterbooster.uy"
    process.env.NODE_ENV = "test"
  })

  afterEach(() => {
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = originalNodeEnv
    }

    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    }
  })

  it("accepts trusted origins configured for the app", () => {
    const request = new NextRequest("https://scooterbooster.uy/api/bookings", {
      method: "POST",
      headers: {
        origin: "https://scooterbooster.uy",
      },
    })

    expect(() => assertTrustedOrigin(request)).not.toThrow()
  })

  it("accepts localhost origins outside production", () => {
    const request = new NextRequest("http://localhost:3000/api/bookings", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
      },
    })

    expect(getTrustedOrigins(request)).toContain("http://localhost:3000")
    expect(() => assertTrustedOrigin(request)).not.toThrow()
  })

  it("accepts missing origin headers on loopback hosts for local browser flows", () => {
    const request = new NextRequest("http://127.0.0.1:3000/api/auth/session", {
      method: "POST",
    })

    expect(() => assertTrustedOrigin(request)).not.toThrow()
  })

  it("rejects requests from untrusted origins", () => {
    const request = new NextRequest("https://scooterbooster.uy/api/bookings", {
      method: "POST",
      headers: {
        origin: "https://evil.example",
      },
    })

    expect(() => assertTrustedOrigin(request)).toThrowError(AppError)
    expect(() => assertTrustedOrigin(request)).toThrow(
      "Unexpected Origin header: https://evil.example"
    )
  })
})
