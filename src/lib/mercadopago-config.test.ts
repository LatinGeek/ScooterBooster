import { afterEach, describe, expect, it } from "vitest"
import {
  getMercadoPagoAccessToken,
  getMercadoPagoEnvironmentCandidates,
  getMercadoPagoPublicKey,
  hasMercadoPagoSelectedAccessToken,
} from "@/lib/mercadopago-config"

const MERCADOPAGO_ENV_KEYS = [
  "MERCADOPAGO_ENVIRONMENT",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_TEST_ACCESS_TOKEN",
  "MERCADOPAGO_LIVE_ACCESS_TOKEN",
  "MERCADOPAGO_PUBLIC_KEY",
  "MERCADOPAGO_TEST_PUBLIC_KEY",
  "MERCADOPAGO_LIVE_PUBLIC_KEY",
  "NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY",
  "NEXT_PUBLIC_MERCADOPAGO_TEST_PUBLIC_KEY",
  "NEXT_PUBLIC_MERCADOPAGO_LIVE_PUBLIC_KEY",
] as const

function clearMercadoPagoEnv() {
  for (const key of MERCADOPAGO_ENV_KEYS) {
    delete process.env[key]
  }
}

afterEach(() => {
  clearMercadoPagoEnv()
})

describe("mercadopago-config", () => {
  it("allows test mode to use legacy credentials for local compatibility", () => {
    clearMercadoPagoEnv()
    process.env.MERCADOPAGO_ENVIRONMENT = "test"
    process.env.MERCADOPAGO_ACCESS_TOKEN = "legacy-test-token"
    process.env.MERCADOPAGO_PUBLIC_KEY = "legacy-test-public-key"

    expect(getMercadoPagoAccessToken("test")).toBe("legacy-test-token")
    expect(getMercadoPagoPublicKey("test")).toBe("legacy-test-public-key")
    expect(hasMercadoPagoSelectedAccessToken()).toBe(true)
  })

  it("requires live-specific credentials when live mode is selected", () => {
    clearMercadoPagoEnv()
    process.env.MERCADOPAGO_ENVIRONMENT = "live"
    process.env.MERCADOPAGO_ACCESS_TOKEN = "legacy-token"
    process.env.MERCADOPAGO_TEST_ACCESS_TOKEN = "test-token"
    process.env.MERCADOPAGO_PUBLIC_KEY = "legacy-public-key"
    process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY = "legacy-next-public-key"

    expect(getMercadoPagoAccessToken("live")).toBe("")
    expect(getMercadoPagoPublicKey("live")).toBeNull()
    expect(hasMercadoPagoSelectedAccessToken()).toBe(false)
  })

  it("uses only the live environment candidate when live mode is selected", () => {
    clearMercadoPagoEnv()
    process.env.MERCADOPAGO_ENVIRONMENT = "live"

    expect(getMercadoPagoEnvironmentCandidates()).toEqual(["live"])
  })

  it("uses live-specific credentials when they are present", () => {
    clearMercadoPagoEnv()
    process.env.MERCADOPAGO_ENVIRONMENT = "live"
    process.env.MERCADOPAGO_LIVE_ACCESS_TOKEN = "live-token"
    process.env.NEXT_PUBLIC_MERCADOPAGO_LIVE_PUBLIC_KEY = "live-public-key"

    expect(getMercadoPagoAccessToken("live")).toBe("live-token")
    expect(getMercadoPagoPublicKey("live")).toBe("live-public-key")
    expect(hasMercadoPagoSelectedAccessToken()).toBe(true)
  })
})
