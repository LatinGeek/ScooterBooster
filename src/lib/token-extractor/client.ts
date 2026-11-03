import crypto from "crypto"
import { CookieJar, decryptPayload, encSignature, encryptPayload, generateNonce, safeFilename, signedNonce } from "./crypto"

export const XIAOMI_SERVERS = ["cn", "de", "us", "ru", "tw", "sg", "in", "i2"] as const
export type XiaomiServer = (typeof XIAOMI_SERVERS)[number]

export type XiaomiSession = {
  userId: string
  ssecurity: string
  serviceToken: string
  agent: string
  deviceId: string
  cookies: Record<string, string>
}

export type PendingState = {
  kind: "password" | "captcha" | "email_2fa" | "qr"
  username?: string
  password?: string
  sign?: string
  agent: string
  deviceId: string
  cookies: Record<string, string>
  twofaContext?: string
  twofaIck?: string
  qrLp?: string
  createdAt: number
}

export type ChallengeResult =
  | { status: "challenge"; kind: PendingState["kind"]; data: Record<string, unknown>; pending: PendingState }
  | { status: "ok"; session: XiaomiSession }

export type FirmwareItem = {
  type: "BLE" | "MCU"
  version: string
  url: string
  md5: string | null
  filename: string
}

export type DeviceRecord = {
  server: XiaomiServer
  name: string
  did: string
  mac: string
  localip: string
  token: string
  model: string
  bleKey: string | null
  ltmk: string | null
  ltmkEncrypted: string | null
  ltmkStatus: string | null
}

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return typeof value === "object" && value !== null ? (value as JsonRecord) : {}
}

function resultOf(value: unknown): JsonRecord {
  return asRecord(asRecord(value).result)
}

function toJson(text: string): JsonRecord {
  return JSON.parse(text.replace("&&&START&&&", "")) as JsonRecord
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return ""
}

function numberValue(value: unknown): number {
  return typeof value === "number" ? value : 0
}

function generateAgent(): string {
  const letters = (min: number, max: number, length: number) =>
    Array.from({ length }, () => String.fromCharCode(Math.floor(Math.random() * (max - min + 1)) + min)).join("")
  return `${letters(97, 122, 18)}-${letters(65, 69, 13)} APP/com.xiaomi.mihome APPV/10.5.201`
}

function generateDeviceId(): string {
  return Array.from({ length: 6 }, () => String.fromCharCode(Math.floor(Math.random() * 26) + 97)).join("")
}

export class XiaomiCloudClient {
  private agent: string
  private deviceId: string
  private jar: CookieJar
  private userId: string | null = null
  private ssecurity: string | null = null
  private serviceToken: string | null = null
  private username = ""
  private password = ""
  private sign: string | null = null
  private location: string | null = null
  private twofaContext: string | null = null
  private twofaIck: string | null = null
  private qrLp: string | null = null

  constructor(state?: { session?: XiaomiSession; pending?: PendingState }) {
    const source = state?.session ?? state?.pending
    this.agent = source?.agent ?? generateAgent()
    this.deviceId = source?.deviceId ?? generateDeviceId()
    this.jar = new CookieJar(source?.cookies ?? {})
    if (state?.session) {
      this.userId = state.session.userId
      this.ssecurity = state.session.ssecurity
      this.serviceToken = state.session.serviceToken
    }
    if (state?.pending) {
      this.username = state.pending.username ?? ""
      this.password = state.pending.password ?? ""
      this.sign = state.pending.sign ?? null
      this.twofaContext = state.pending.twofaContext ?? null
      this.twofaIck = state.pending.twofaIck ?? null
      this.qrLp = state.pending.qrLp ?? null
    }
  }

  ready(): boolean {
    return Boolean(this.userId && this.ssecurity && this.serviceToken)
  }

  toSession(): XiaomiSession {
    if (!this.userId || !this.ssecurity || !this.serviceToken) {
      throw new Error("Sesión Xiaomi incompleta")
    }
    return {
      userId: this.userId,
      ssecurity: this.ssecurity,
      serviceToken: this.serviceToken,
      agent: this.agent,
      deviceId: this.deviceId,
      cookies: this.jar.toJSON(),
    }
  }

  private toPending(kind: PendingState["kind"]): PendingState {
    return {
      kind,
      username: this.username || undefined,
      password: this.password || undefined,
      sign: this.sign ?? undefined,
      agent: this.agent,
      deviceId: this.deviceId,
      cookies: this.jar.toJSON(),
      twofaContext: this.twofaContext ?? undefined,
      twofaIck: this.twofaIck ?? undefined,
      qrLp: this.qrLp ?? undefined,
      createdAt: Date.now(),
    }
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers)
    const cookie = this.jar.header()
    if (cookie) headers.set("cookie", cookie)
    const response = await fetch(url, {
      ...init,
      headers,
      redirect: init.redirect ?? "manual",
      cache: "no-store",
    })
    this.jar.absorb(response.headers)
    return response
  }

  private async loginStep1(): Promise<boolean> {
    this.jar.set("sdkVersion", "accountsdk-18.8.15")
    this.jar.set("deviceId", this.deviceId)
    this.jar.set("userId", this.username)
    const response = await this.request("https://account.xiaomi.com/pass/serviceLogin?sid=xiaomiio&_json=true")
    if (!response.ok) return false
    const data = toJson(await response.text())
    if (typeof data._sign === "string") {
      this.sign = data._sign
      return true
    }
    if (typeof data.ssecurity === "string") {
      this.ssecurity = data.ssecurity
      this.userId = stringValue(data.userId) || null
      this.location = stringValue(data.location) || null
      return true
    }
    return false
  }

  async loginPassword(username: string, password: string, captchaCode?: string): Promise<ChallengeResult> {
    if (!username || !password) throw new Error("Usuario y contraseña son obligatorios")
    this.username = username
    this.password = password
    if (!(await this.loginStep1())) {
      throw new Error("Usuario no válido o cuenta no encontrada")
    }
    return this.loginStep2(captchaCode)
  }

  async retryCaptcha(code: string): Promise<ChallengeResult> {
    return this.loginStep2(code)
  }

  private async loginStep2(captchaCode?: string): Promise<ChallengeResult> {
    const fields: Record<string, string> = {
      sid: "xiaomiio",
      hash: crypto.createHash("md5").update(this.password, "utf8").digest("hex").toUpperCase(),
      callback: "https://sts.api.io.mi.com/sts",
      qs: "%3Fsid%3Dxiaomiio%26_json%3Dtrue",
      user: this.username,
      _sign: this.sign ?? "",
      _json: "true",
    }
    const request = async () => {
      const body = new URLSearchParams(fields)
      return this.request("https://account.xiaomi.com/pass/serviceLoginAuth2", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      })
    }

    let response = await request()
    if (!response.ok) throw new Error(`Error de login HTTP ${response.status}`)
    let data = toJson(await response.text())
    const captchaUrl = stringValue(data.captchaUrl)

    if (captchaUrl) {
      if (!captchaCode) {
        const absolute = captchaUrl.startsWith("/") ? `https://account.xiaomi.com${captchaUrl}` : captchaUrl
        const image = await this.request(absolute)
        const encoded = Buffer.from(await image.arrayBuffer()).toString("base64")
        return {
          status: "challenge",
          kind: "captcha",
          data: {
            imageDataUrl: `data:${image.headers.get("content-type") ?? "image/jpeg"};base64,${encoded}`,
            message: "Introduce el captcha para continuar",
          },
          pending: this.toPending("captcha"),
        }
      }
      fields.captCode = captchaCode
      response = await request()
      if (!response.ok) throw new Error(`Error de captcha HTTP ${response.status}`)
      data = toJson(await response.text())
    }

    if (typeof data.ssecurity === "string" && data.ssecurity.length > 4) {
      this.ssecurity = data.ssecurity
      this.userId = stringValue(data.userId) || null
      this.location = stringValue(data.location) || null
      if (!this.serviceToken && this.location) await this.loginStep3()
      if (!this.ready()) throw new Error("Login incompleto")
      return { status: "ok", session: this.toSession() }
    }

    const notificationUrl = stringValue(data.notificationUrl)
    if (notificationUrl) {
      return this.startEmail2fa(notificationUrl)
    }

    throw new Error(stringValue(data.description) || "Login rechazado. Prueba con QR.")
  }

  private async loginStep3(): Promise<boolean> {
    if (!this.location) return false
    const response = await this.request(new URL(this.location, "https://account.xiaomi.com").toString())
    if (!response.ok) return false
    this.serviceToken = this.jar.get("serviceToken") ?? this.serviceToken
    return Boolean(this.serviceToken)
  }

  private async startEmail2fa(notificationUrl: string): Promise<ChallengeResult> {
    const response = await this.request(notificationUrl)
    if (!response.ok) throw new Error("No se pudo iniciar la verificación por email")
    const context = new URL(notificationUrl).searchParams.get("context")
    if (!context) throw new Error("Respuesta 2FA sin contexto")
    await this.request(
      `https://account.xiaomi.com/identity/list?${new URLSearchParams({
        sid: "xiaomiio",
        context,
        _locale: "en_US",
      }).toString()}`
    )
    await this.request(
      `https://account.xiaomi.com/identity/auth/sendEmailTicket?${new URLSearchParams({
        _dc: String(Date.now()),
        sid: "xiaomiio",
        context,
        mask: "0",
        _locale: "en_US",
      }).toString()}`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          retry: "0",
          icode: "",
          _json: "true",
          ick: this.jar.get("ick") ?? "",
        }),
      }
    )
    this.twofaContext = context
    this.twofaIck = this.jar.get("ick") ?? null
    return {
      status: "challenge",
      kind: "email_2fa",
      data: { message: "Introduce el código enviado al email de la cuenta Xiaomi" },
      pending: this.toPending("email_2fa"),
    }
  }

  async finishEmail2fa(code: string): Promise<ChallengeResult> {
    if (!this.twofaContext) throw new Error("No hay una verificación 2FA pendiente")
    if (!code) throw new Error("Falta el código 2FA")
    const params = new URLSearchParams({
      _flag: "8",
      _json: "true",
      sid: "xiaomiio",
      context: this.twofaContext,
      mask: "0",
      _locale: "en_US",
    })
    const response = await this.request(
      `https://account.xiaomi.com/identity/auth/verifyEmail?${params.toString()}`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          _flag: "8",
          ticket: code,
          trust: "false",
          _json: "true",
          ick: this.twofaIck ?? "",
        }),
      }
    )
    if (!response.ok) throw new Error("Código 2FA rechazado")
    let finishLocation: string | null = null
    try {
      const data = (await response.json()) as JsonRecord
      finishLocation = stringValue(data.location) || null
    } catch {
      finishLocation = response.headers.get("location")
    }
    if (!finishLocation) throw new Error("No se pudo completar la verificación 2FA")
    finishLocation = new URL(finishLocation, "https://account.xiaomi.com").toString()
    if (finishLocation.includes("identity/result/check")) {
      const check = await this.request(finishLocation)
      const location = check.headers.get("location")
      finishLocation = location ? new URL(location, "https://account.xiaomi.com").toString() : null
    }
    if (!finishLocation) throw new Error("Redirección 2FA incompleta")
    const end = await this.request(finishLocation)
    const extension = end.headers.get("extension-pragma")
    if (extension) {
      try {
        const parsed = JSON.parse(extension) as JsonRecord
        if (typeof parsed.ssecurity === "string") this.ssecurity = parsed.ssecurity
      } catch {
        /* ignored */
      }
    }
    const stsLocation = end.headers.get("location")
    if (!stsLocation) throw new Error("No se pudo obtener el STS de Xiaomi")
    const sts = await this.request(stsLocation, { redirect: "follow" })
    if (!sts.ok) throw new Error("STS de Xiaomi no completado")
    this.serviceToken = this.jar.get("serviceToken") ?? null
    this.twofaContext = null
    this.twofaIck = null
    if (!this.ready()) throw new Error("Login 2FA incompleto")
    return { status: "ok", session: this.toSession() }
  }

  async qrStart(): Promise<ChallengeResult> {
    const params = new URLSearchParams({
      _qrsize: "480",
      qs: "%3Fsid%3Dxiaomiio%26_json%3Dtrue",
      callback: "https://sts.api.io.mi.com/sts",
      _hasLogo: "false",
      sid: "xiaomiio",
      serviceParam: "",
      _locale: "en_GB",
      _dc: String(Date.now()),
    })
    const response = await this.request(`https://account.xiaomi.com/longPolling/loginUrl?${params.toString()}`)
    if (!response.ok) throw new Error("No se pudo iniciar el login QR")
    const data = toJson(await response.text())
    const qrUrl = stringValue(data.qr)
    const qrLp = stringValue(data.lp)
    if (!qrUrl || !qrLp) throw new Error("Xiaomi no devolvió una imagen QR")
    const image = await this.request(qrUrl)
    if (!image.ok) throw new Error("No se pudo descargar la imagen QR")
    this.qrLp = qrLp
    const encoded = Buffer.from(await image.arrayBuffer()).toString("base64")
    return {
      status: "challenge",
      kind: "qr",
      data: {
        imageDataUrl: `data:${image.headers.get("content-type") ?? "image/png"};base64,${encoded}`,
        loginUrl: stringValue(data.loginUrl),
        expiresIn: numberValue(data.timeout) || 120,
        message: "Escanea el QR con la app Xiaomi Home",
      },
      pending: this.toPending("qr"),
    }
  }

  async qrPoll(): Promise<ChallengeResult> {
    if (!this.qrLp) throw new Error("No hay un QR pendiente")
    const response = await this.request(this.qrLp)
    if (!response.ok) return { status: "challenge", kind: "qr", data: {}, pending: this.toPending("qr") }
    const data = toJson(await response.text())
    if (!stringValue(data.userId) || !stringValue(data.ssecurity)) {
      return { status: "challenge", kind: "qr", data: {}, pending: this.toPending("qr") }
    }
    this.userId = stringValue(data.userId)
    this.ssecurity = stringValue(data.ssecurity)
    this.location = stringValue(data.location) || null
    await this.loginStep3()
    if (!this.ready()) throw new Error("Login QR incompleto")
    return { status: "ok", session: this.toSession() }
  }

  private apiUrl(server: XiaomiServer): string {
    return `https://${server === "cn" ? "" : `${server}.`}api.io.mi.com/app`
  }

  private async execute(server: XiaomiServer, path: string, data: JsonRecord): Promise<JsonRecord> {
    if (!this.ready() || !this.userId || !this.ssecurity || !this.serviceToken) {
      throw new Error("Sesión Xiaomi no autenticada")
    }
    this.jar.set("userId", this.userId)
    this.jar.set("serviceToken", this.serviceToken)
    this.jar.set("yetAnotherServiceToken", this.serviceToken)
    this.jar.set("locale", "en_GB")
    this.jar.set("timezone", "GMT+02:00")
    this.jar.set("is_daylight", "1")
    this.jar.set("dst_offset", "3600000")
    this.jar.set("channel", "MI_APP_STORE")

    const url = this.apiUrl(server) + path
    const baseParams: Record<string, string> = { data: JSON.stringify(data) }
    const nonce = generateNonce(Date.now())
    const signatureNonce = signedNonce(nonce, this.ssecurity)
    const params: Record<string, string> = {
      ...baseParams,
      rc4_hash__: encSignature(url, "POST", signatureNonce, baseParams),
    }
    for (const [key, value] of Object.entries(params)) {
      params[key] = encryptPayload(signatureNonce, value)
    }
    params.signature = encSignature(url, "POST", signatureNonce, params)
    params.ssecurity = this.ssecurity
    params._nonce = nonce

    const response = await this.request(`https://${server === "cn" ? "" : `${server}.`}api.io.mi.com/app${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "accept-encoding": "identity",
        "x-xiaomi-protocal-flag-cli": "PROTOCAL-HTTP2",
        "MIOT-ENCRYPT-ALGORITHM": "ENCRYPT-RC4",
      },
      body: new URLSearchParams(params),
    })
    if (!response.ok) throw new Error(`Xiaomi Cloud respondió HTTP ${response.status}`)
    const text = await response.text()
    return JSON.parse(decryptPayload(signedNonce(nonce, this.ssecurity), text)) as JsonRecord
  }

  async getHomes(server: XiaomiServer): Promise<JsonRecord> {
    return this.execute(server, "/v2/homeroom/gethome", {
      fg: true,
      fetch_share: true,
      fetch_share_dev: true,
      limit: 300,
      app_ver: 7,
    })
  }

  async getDeviceCount(server: XiaomiServer): Promise<JsonRecord> {
    return this.execute(server, "/v2/user/get_device_cnt", { fetch_own: true, fetch_share: true })
  }

  async getDevices(server: XiaomiServer, homeId: number, ownerId: string): Promise<JsonRecord> {
    return this.execute(server, "/v2/home/home_device_list", {
      home_owner: ownerId,
      home_id: homeId,
      limit: 200,
      get_split_device: true,
      support_smart_home: true,
    })
  }

  async getBeaconKey(server: XiaomiServer, did: string): Promise<JsonRecord> {
    return this.execute(server, "/v2/device/blt_get_beaconkey", { did, pdid: 1 })
  }

  async getBluetoothKey(server: XiaomiServer, did: string): Promise<JsonRecord> {
    return this.execute(server, "/share/askbluetoothkey", { type: "own", did, keyid: 0 })
  }

  async getLatestVersion(server: XiaomiServer, did: string, model: string): Promise<JsonRecord> {
    return this.execute(server, "/v2/device/latest_ver", {
      did,
      model,
      platform: "android",
      plugin_level: 0,
      app_level: 0,
    })
  }

  async scan(servers: XiaomiServer[], pin?: string): Promise<{
    servers: Array<{ server: XiaomiServer; homes: unknown[]; devices: DeviceRecord[]; errors: string[]; homeCount: number }>
    devices: DeviceRecord[]
    totalDevices: number
  }> {
    const result = {
      servers: [] as Array<{ server: XiaomiServer; homes: unknown[]; devices: DeviceRecord[]; errors: string[]; homeCount: number }>,
      devices: [] as DeviceRecord[],
      totalDevices: 0,
    }
    const seen = new Set<string>()
    for (const server of servers) {
      const entry = { server, homes: [] as unknown[], devices: [] as DeviceRecord[], errors: [] as string[], homeCount: 0 }
      try {
        const homesData = resultOf(await this.getHomes(server))
        const homes = Array.isArray(homesData.homelist) ? homesData.homelist : []
        const countData = resultOf(await this.getDeviceCount(server))
        const share = asRecord(countData.share)
        const shared = Array.isArray(share.share_family) ? share.share_family : []
        const refs = [
          ...homes.map((home) => ({ homeId: numberValue(asRecord(home).id), ownerId: this.userId ?? "" })),
          ...shared.map((home) => ({
            homeId: numberValue(asRecord(home).home_id),
            ownerId: stringValue(asRecord(home).home_owner),
          })),
        ].filter((home) => home.homeId && home.ownerId)
        entry.homeCount = refs.length
        for (const home of refs) {
          const devicesData = resultOf(await this.getDevices(server, home.homeId, home.ownerId))
          const deviceInfo = Array.isArray(devicesData.device_info) ? devicesData.device_info : []
          const homeEntry = { homeId: home.homeId, homeOwner: home.ownerId, devices: [] as DeviceRecord[] }
          for (const raw of deviceInfo) {
            const device = asRecord(raw)
            const did = stringValue(device.did)
            if (!did) continue
            const key = `${server}:${did}`
            if (seen.has(key)) continue
            seen.add(key)
            const record = await this.deviceRecord(server, device, pin)
            homeEntry.devices.push(record)
            entry.devices.push(record)
            result.devices.push(record)
          }
          entry.homes.push(homeEntry)
        }
      } catch (error) {
        entry.errors.push(error instanceof Error ? error.message : String(error))
      }
      result.servers.push(entry)
    }
    result.totalDevices = result.devices.length
    return result
  }

  private async deviceRecord(server: XiaomiServer, device: JsonRecord, pin?: string): Promise<DeviceRecord> {
    const did = stringValue(device.did)
    const record: DeviceRecord = {
      server,
      name: stringValue(device.name) || "Dispositivo",
      did,
      mac: stringValue(device.mac),
      localip: stringValue(device.localip),
      token: stringValue(device.token),
      model: stringValue(device.model),
      bleKey: null,
      ltmk: null,
      ltmkEncrypted: null,
      ltmkStatus: null,
    }
    if (!did.includes("blt")) return record
    try {
      const beacon = resultOf(await this.getBeaconKey(server, did))
      if (typeof beacon.beaconkey === "string") record.bleKey = beacon.beaconkey
    } catch {
      /* ignored */
    }
    try {
      const blue = resultOf(await this.getBluetoothKey(server, did))
      const rawKey = stringValue(blue.key)
      if (!rawKey) return record
      const encryptType = numberValue(blue.encrypt_type)
      if (encryptType === 0) {
        record.ltmk = rawKey
        record.ltmkStatus = "plaintext"
      } else if (pin) {
        try {
          const decipher = crypto.createDecipheriv(
            "aes-128-cbc",
            crypto.createHash("md5").update(pin, "utf8").digest(),
            Buffer.from("7aa4c68c590d4031b980d98b41023800", "hex")
          )
          record.ltmk = Buffer.concat([decipher.update(Buffer.from(rawKey, "hex")), decipher.final()]).toString("hex")
          record.ltmkStatus = "decrypted"
        } catch {
          record.ltmkEncrypted = rawKey
          record.ltmkStatus = "decrypt_error"
        }
      } else {
        record.ltmkEncrypted = rawKey
        record.ltmkStatus = "pin_required"
      }
    } catch {
      /* ignored */
    }
    return record
  }

  async findFirmware(did: string, model: string, preferredServer?: XiaomiServer): Promise<{
    server: XiaomiServer | null
    items: FirmwareItem[]
    changelog: string
    errors: Array<{ server: XiaomiServer; error: string }>
  }> {
    const servers = preferredServer
      ? [preferredServer, ...XIAOMI_SERVERS.filter((server) => server !== preferredServer)]
      : [...XIAOMI_SERVERS]
    const errors: Array<{ server: XiaomiServer; error: string }> = []
    for (const server of servers) {
      try {
        const result = resultOf(await this.getLatestVersion(server, did, model))
        const items = firmwareItems(result, model)
        if (items.length) {
          return {
            server,
            items,
            changelog: stringValue(result.changeLog) || stringValue(result.fw_change_log),
            errors,
          }
        }
      } catch (error) {
        errors.push({ server, error: error instanceof Error ? error.message : String(error) })
      }
    }
    return { server: null, items: [], changelog: "", errors }
  }

  async downloadFirmware(url: string, expectedMd5?: string | null): Promise<{
    content: Buffer
    md5: string
    size: number
    signatureMarker: string
  }> {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new Error("URL de firmware no válida")
    }
    const host = parsed.hostname.toLowerCase()
    const allowed = [".mi.com", ".mi-img.com", ".xiaomi.com", ".miui.com"]
    if (parsed.protocol !== "https:" || !allowed.some((suffix) => host.endsWith(suffix))) {
      throw new Error("El host de descarga no pertenece a Xiaomi")
    }
    const response = await fetch(url, { redirect: "manual", cache: "no-store" })
    if (response.status >= 300 && response.status < 400) {
      throw new Error("La descarga intentó redirigir fuera del host permitido")
    }
    if (!response.ok) throw new Error(`HTTP ${response.status} al descargar`)
    const declared = Number(response.headers.get("content-length") ?? 0)
    if (declared > 64 * 1024 * 1024) throw new Error("El firmware excede el límite permitido")
    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length > 64 * 1024 * 1024) throw new Error("El firmware excede el límite permitido")
    const md5 = crypto.createHash("md5").update(buffer).digest("hex")
    if (expectedMd5 && md5.toLowerCase() !== expectedMd5.toLowerCase()) {
      throw new Error(`MD5 no coincide: esperado ${expectedMd5}, recibido ${md5}`)
    }
    const tail = buffer.subarray(Math.max(0, buffer.length - 4096))
    const head = buffer.subarray(0, 4096)
    const marker = head.includes(Buffer.from("MITFOTA")) || tail.includes(Buffer.from("MITFOTA"))
      ? "MITFOTA"
      : head.includes(Buffer.from("TFOTA")) || tail.includes(Buffer.from("TFOTA"))
        ? "TFOTA"
        : "Unsigned"
    return { content: buffer, md5, size: buffer.length, signatureMarker: marker }
  }
}

export function firmwareItems(result: JsonRecord, model: string): FirmwareItem[] {
  const bleUrl = stringValue(result.safe_url) || stringValue(result.url) || stringValue(result.download_url)
  const bleVersion = stringValue(result.version) || stringValue(result.ver) || "N/A"
  const bleMd5 = stringValue(result.md5) || stringValue(result.md5sum) || null
  const mcuUrl = stringValue(result.mcu_safe_url) || stringValue(result.mcu_url)
  const mcuVersion = stringValue(result.mcu_version) || "N/A"
  const mcuMd5 = stringValue(result.mcu_md5) || null
  const cleanModel = safeFilename(model || "xiaomi.scooter", "xiaomi.scooter")
  const items: FirmwareItem[] = []
  if (bleUrl) {
    items.push({
      type: "BLE",
      version: bleVersion,
      url: bleUrl,
      md5: bleMd5,
      filename: `ble_v${bleVersion}_${cleanModel}_${bleMd5?.slice(0, 8) ?? "unknown"}.bin`,
    })
  }
  if (mcuUrl) {
    items.push({
      type: "MCU",
      version: mcuVersion,
      url: mcuUrl,
      md5: mcuMd5,
      filename: `mcu_v${mcuVersion}_${cleanModel}_${mcuMd5?.slice(0, 8) ?? "unknown"}.bin`,
    })
  }
  return items
}
