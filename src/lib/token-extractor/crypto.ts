import crypto from "crypto"

export function rc4(key: Buffer, data: Buffer, drop = 0): Buffer {
  if (key.length === 0) throw new Error("RC4 key is empty")
  const s = Array.from({ length: 256 }, (_, index) => index)
  let j = 0
  for (let i = 0; i < 256; i += 1) {
    j = (j + s[i]! + key[i % key.length]!) & 0xff
    const tmp = s[i]!
    s[i] = s[j]!
    s[j] = tmp
  }

  const out = Buffer.alloc(data.length)
  let i = 0
  j = 0
  for (let n = 0; n < data.length + drop; n += 1) {
    i = (i + 1) & 0xff
    j = (j + s[i]!) & 0xff
    const tmp = s[i]!
    s[i] = s[j]!
    s[j] = tmp
    const byte = data[n - drop]
    if (n >= drop && byte !== undefined) {
      out[n - drop] = byte ^ s[(s[i]! + s[j]!) & 0xff]!
    }
  }
  return out
}

export function generateNonce(millis: number): string {
  const nonce = Buffer.alloc(12)
  crypto.randomFillSync(nonce, 0, 8)
  nonce.writeUInt32BE(Math.floor(millis / 60000), 8)
  return nonce.toString("base64")
}

export function signedNonce(nonce: string, ssecurity: string): string {
  const digest = crypto
    .createHash("sha256")
    .update(Buffer.concat([Buffer.from(ssecurity, "base64"), Buffer.from(nonce, "base64")]))
    .digest()
  return digest.toString("base64")
}

export function encSignature(
  url: string,
  method: string,
  nonce: string,
  params: Record<string, string>
): string {
  const suffix = url.split("com")[1]
  if (!suffix) throw new Error("Unexpected Xiaomi API URL")
  const parts = [method.toUpperCase(), suffix.replace("/app/", "/")]
  for (const [key, value] of Object.entries(params)) {
    parts.push(`${key}=${value}`)
  }
  parts.push(nonce)
  return crypto.createHash("sha1").update(parts.join("&"), "utf8").digest("base64")
}

export function encryptPayload(password: string, payload: string): string {
  const key = Buffer.from(password, "base64")
  return rc4(key, Buffer.from(payload, "utf8"), 1024).toString("base64")
}

export function decryptPayload(password: string, payload: string): string {
  const key = Buffer.from(password, "base64")
  return rc4(key, Buffer.from(payload, "base64"), 1024).toString("utf8")
}

export function safeFilename(name: unknown, fallback = "firmware.bin"): string {
  const raw = String(name ?? "")
    .split(/[\\/]/)
    .pop()
    ?.trim()
  const clean = (raw ?? "").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 180)
  return clean || fallback
}

export class CookieJar {
  private cookies: Record<string, string>

  constructor(initial: Record<string, string> = {}) {
    this.cookies = { ...initial }
  }

  set(name: string, value: string): void {
    this.cookies[name] = value
  }

  get(name: string): string | undefined {
    return this.cookies[name]
  }

  header(): string {
    return Object.entries(this.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join("; ")
  }

  absorb(headers: Headers): void {
    const extended = headers as Headers & { getSetCookie?: () => string[] }
    const values =
      typeof extended.getSetCookie === "function"
        ? extended.getSetCookie()
        : [headers.get("set-cookie")].filter((value): value is string => Boolean(value))
    for (const value of values) {
      const pair = value.split(";", 1)[0]
      if (!pair) continue
      const index = pair.indexOf("=")
      if (index <= 0) continue
      this.cookies[pair.slice(0, index).trim()] = pair.slice(index + 1).trim()
    }
  }

  toJSON(): Record<string, string> {
    return { ...this.cookies }
  }
}

function sessionKey(): Buffer {
  const secret = process.env.TOKEN_EXTRACTOR_SESSION_SECRET ?? process.env.CRON_SECRET
  if (!secret) {
    throw new Error("TOKEN_EXTRACTOR_SESSION_SECRET or CRON_SECRET is required")
  }
  return crypto.createHash("sha256").update(secret, "utf8").digest()
}

export function encryptJson(value: unknown): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", sessionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString("base64url")
}

export function decryptJson<T>(value: string | undefined): T | null {
  if (!value) return null
  try {
    const raw = Buffer.from(value, "base64url")
    if (raw.length < 28) return null
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const ciphertext = raw.subarray(28)
    const decipher = crypto.createDecipheriv("aes-256-gcm", sessionKey(), iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])
    return JSON.parse(decrypted.toString("utf8")) as T
  } catch {
    return null
  }
}
