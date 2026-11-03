import { beforeAll, describe, expect, it } from "vitest"
import {
  CookieJar,
  decryptJson,
  decryptPayload,
  encSignature,
  encryptJson,
  encryptPayload,
  safeFilename,
  signedNonce,
} from "./crypto"
import { XiaomiCloudClient, firmwareItems } from "./client"

beforeAll(() => {
  process.env.TOKEN_EXTRACTOR_SESSION_SECRET = "test-secret-for-token-extractor"
})

describe("token extractor crypto", () => {
  it("round-trips RC4 with the 1024-byte drop", () => {
    const key = Buffer.from("0123456789abcdef")
    const encrypted = encryptPayload(key.toString("base64"), '{"hello":"world"}')
    expect(encrypted).not.toContain("hello")
    expect(decryptPayload(key.toString("base64"), encrypted)).toBe('{"hello":"world"}')
  })

  it("produces a deterministic signed nonce", () => {
    const first = signedNonce("bm9uY2U=", "c2VjdXJpdHk=")
    expect(first).toBe(signedNonce("bm9uY2U=", "c2VjdXJpdHk="))
    expect(first).not.toBe(signedNonce("bm9uY2U=", "b3RoZXI="))
  })

  it("changes the request signature with the payload", () => {
    const url = "https://de.api.io.mi.com/app/v2/test"
    expect(encSignature(url, "POST", "nonce", { data: "a" })).not.toBe(
      encSignature(url, "POST", "nonce", { data: "b" })
    )
  })

  it("absorbs and emits cookies", () => {
    const jar = new CookieJar()
    const headers = new Headers()
    headers.append("set-cookie", "serviceToken=abc; Path=/; HttpOnly")
    headers.append("set-cookie", "userId=123; Path=/")
    jar.absorb(headers)
    expect(jar.get("serviceToken")).toBe("abc")
    expect(jar.header()).toContain("userId=123")
  })

  it("encrypts and decrypts the session envelope", () => {
    const value = { userId: "1", ssecurity: "secret" }
    const encoded = encryptJson(value)
    expect(encoded).not.toContain("secret")
    expect(decryptJson<typeof value>(encoded)).toEqual(value)
  })

  it("sanitizes downloaded filenames", () => {
    expect(safeFilename("../../etc/passwd")).toBe("passwd")
    expect(safeFilename("..\\..\\evil.bin")).toBe("evil.bin")
    expect(safeFilename(null)).toBe("firmware.bin")
  })

  it("extracts BLE and MCU firmware items", () => {
    const items = firmwareItems(
      {
        safe_url: "https://cdn.example.mi.com/ble.bin",
        version: "2.7.0_0029",
        md5: "a".repeat(32),
        mcu_safe_url: "https://cdn.example.mi.com/mcu.bin",
        mcu_version: "1.2.3",
        mcu_md5: "b".repeat(32),
      },
      "xiaomi.scooter.6"
    )
    expect(items.map((item) => item.type)).toEqual(["BLE", "MCU"])
    expect(items[0]?.filename).toContain("xiaomi.scooter.6")
  })

  it("rejects non-Xiaomi firmware hosts before network access", async () => {
    const client = new XiaomiCloudClient()
    await expect(client.downloadFirmware("https://evil.example/fw.bin")).rejects.toThrow(
      "no pertenece a Xiaomi"
    )
  })
})
