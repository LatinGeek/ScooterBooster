import crypto from "crypto"
import { describe, expect, it, vi } from "vitest"
import { XiaomiCloudClient } from "./client"

function fixture(did: string, model = "xiaomi.scooter.6", bluetooth: Record<string, unknown> = {}) {
  const client = new XiaomiCloudClient({ session: {
    userId: "fixture-owner", ssecurity: "c2VjcmV0", serviceToken: "fixture-session",
    agent: "test", deviceId: "test", cookies: {},
  } })
  vi.spyOn(client, "getHomes").mockResolvedValue({ code: 0, result: { homelist: [{ id: 1 }] } })
  vi.spyOn(client, "getDeviceCount").mockResolvedValue({ code: 0, result: {} })
  vi.spyOn(client, "getDevices").mockResolvedValue({ code: 0, result: { device_info: [{
    did, model, name: "Fixture scooter", mac: "00:11:22:33:44:55",
  }] } })
  const beacon = vi.spyOn(client, "getBeaconKey").mockResolvedValue({ code: 0, result: { beaconkey: "11".repeat(16) } })
  const owner = vi.spyOn(client, "getBluetoothKey").mockResolvedValue({ code: 0, result: bluetooth })
  return { client, beacon, owner }
}

describe("BLE credentials for Xiaomi scooters", () => {
  it("queries owner and beacon keys for a numeric Mi 6 DID", async () => {
    const { client, beacon, owner } = fixture("1234567890", undefined, { key: "22".repeat(32), encrypt_type: 0 })
    const result = await client.scan(["tw"])
    expect(beacon).toHaveBeenCalledWith("tw", "1234567890")
    expect(owner).toHaveBeenCalledWith("tw", "1234567890")
    expect(result.devices[0]?.bleKey).toBe("11".repeat(16))
    expect(result.devices[0]?.ltmk).toBe("22".repeat(32))
    expect(result.devices[0]?.ltmkStatus).toBe("plaintext")
  })

  it("keeps querying existing blt devices", async () => {
    const { client, owner } = fixture("blt.4.fixture", "fixture.sensor")
    await client.scan(["sg"])
    expect(owner).toHaveBeenCalledWith("sg", "blt.4.fixture")
  })

  it("does not query BLE credentials for an unrelated numeric device", async () => {
    const { client, beacon, owner } = fixture("1234567890", "fixture.airpurifier")
    await client.scan(["sg"])
    expect(beacon).not.toHaveBeenCalled()
    expect(owner).not.toHaveBeenCalled()
  })

  it("retains a PIN-protected key until a PIN is supplied", async () => {
    const encrypted = "33".repeat(32)
    const { client } = fixture("1234567890", undefined, { key: encrypted, encrypt_type: 1 })
    const result = await client.scan(["in"])
    expect(result.devices[0]?.ltmk).toBeNull()
    expect(result.devices[0]?.ltmkEncrypted).toBe(encrypted)
    expect(result.devices[0]?.ltmkStatus).toBe("pin_required")
  })

  it("decrypts all 32 bytes of a PIN-protected key without PKCS7 padding", async () => {
    const plain = Buffer.from(Array.from({ length: 32 }, (_, i) => i))
    const cipher = crypto.createCipheriv("aes-128-cbc", crypto.createHash("md5").update("1234").digest(),
      Buffer.from("7aa4c68c590d4031b980d98b41023800", "hex"))
    cipher.setAutoPadding(false)
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]).toString("hex")
    const { client } = fixture("1234567890", undefined, { key: encrypted, encrypt_type: 1 })
    const result = await client.scan(["in"], "1234")
    expect(result.devices[0]?.ltmk).toBe(plain.toString("hex"))
    expect(result.devices[0]?.ltmkStatus).toBe("decrypted")
  })

  it("reports cloud rejection while retaining the independently available beacon key", async () => {
    const { client, owner } = fixture("1234567890")
    owner.mockResolvedValue({ code: -1, message: "private response detail", result: {} })
    const { devices } = await client.scan(["tw"])
    expect(devices[0]?.bleKey).toBe("11".repeat(16))
    expect(devices[0]?.ltmk).toBeNull()
    expect(devices[0]?.ltmkStatus).toBe("cloud_rejected")
    expect(devices[0]?.ltmkDiagnostic?.cloudCode).toBe(-1)
    expect(JSON.stringify(devices)).not.toContain("private response detail")
  })

  it("distinguishes a successful response without a key", async () => {
    const { client } = fixture("1234567890", undefined, { encrypt_type: 0 })
    const { devices } = await client.scan(["sg"])
    expect(devices[0]?.ltmkStatus).toBe("not_returned")
    expect(devices[0]?.ltmkDiagnostic?.cloudCode).toBe(0)
  })

  it("accepts an unencrypted 32-byte key encoded as canonical base64 without a PIN", async () => {
    const plain = Buffer.from(Array.from({ length: 32 }, (_, i) => i))
    const { client } = fixture("1234567890", undefined, { key: plain.toString("base64"), encrypt_type: 0 })
    const { devices } = await client.scan(["tw"])
    expect(devices[0]?.ltmk).toBe(plain.toString("hex"))
    expect(devices[0]?.ltmkDiagnostic?.keyEncoding).toBe("base64")
    expect(devices[0]?.ltmkDiagnostic?.pinProvided).toBe(false)
  })

  it("decodes base64 before decrypting a PIN-protected 32-byte key", async () => {
    const plain = Buffer.from(Array.from({ length: 32 }, (_, i) => 255 - i))
    const cipher = crypto.createCipheriv("aes-128-cbc", crypto.createHash("md5").update("1234").digest(),
      Buffer.from("7aa4c68c590d4031b980d98b41023800", "hex"))
    cipher.setAutoPadding(false)
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]).toString("base64")
    const { client } = fixture("1234567890", undefined, { key: encrypted, encrypt_type: 1 })
    const { devices } = await client.scan(["in"], "1234")
    expect(devices[0]?.ltmk).toBe(plain.toString("hex"))
    expect(devices[0]?.ltmkDiagnostic?.keyEncoding).toBe("base64")
  })

  it("rejects unsupported key text without calling it an incorrect PIN", async () => {
    const raw = "opaque-key-with-unknown-format"
    const { client } = fixture("1234567890", undefined, { key: raw, encrypt_type: 1 })
    const { devices } = await client.scan(["in"], "1234")
    expect(devices[0]?.ltmkStatus).toBe("invalid_key_format")
    expect(devices[0]?.ltmkDiagnostic?.rawKeyCharacters).toBe(raw.length)
    expect(JSON.stringify(devices[0]?.ltmkDiagnostic)).not.toContain(raw)
  })

  it("reports HTTP failures without returning an exception that may contain secrets", async () => {
    const { client, owner } = fixture("1234567890")
    owner.mockRejectedValue(new Error("Xiaomi Cloud respondió HTTP 401; private session value"))
    const { devices } = await client.scan(["in"])
    expect(devices[0]?.ltmkStatus).toBe("request_failed")
    expect(devices[0]?.ltmkDiagnostic?.httpStatus).toBe(401)
    expect(JSON.stringify(devices)).not.toContain("private session value")
  })

  it("does not treat a 16-byte key as the required 32-byte LTMK", async () => {
    const { client } = fixture("1234567890", undefined, { key: "11".repeat(16), encrypt_type: 0 })
    const { devices } = await client.scan(["tw"])
    expect(devices[0]?.ltmkStatus).toBe("invalid_key_format")
    expect(devices[0]?.ltmkDiagnostic?.keyBytes).toBe(16)
    expect(devices[0]?.ltmk).toBeNull()
  })

  it.each([7, undefined])("does not guess the meaning of encryption type %s", async (encryptType) => {
    const { client } = fixture("1234567890", undefined, { key: "33".repeat(32), encrypt_type: encryptType })
    const { devices } = await client.scan(["tw"], "1234")
    expect(devices[0]?.ltmkStatus).toBe("unsupported_encryption")
    expect(devices[0]?.ltmk).toBeNull()
  })
})
