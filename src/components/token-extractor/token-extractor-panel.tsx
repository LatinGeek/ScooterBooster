"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
} from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const SERVERS = ["cn", "de", "us", "ru", "tw", "sg", "in", "i2"] as const

type SessionInfo = {
  authenticated: boolean
  userId: string | null
  role: string
  servers: string[]
}

type Challenge = {
  type: "captcha" | "email_2fa" | "qr"
  message?: string
  imageDataUrl?: string
  loginUrl?: string
  expiresIn?: number
}

type LoginResponse =
  | { status: "ok"; authenticated: true; userId: string }
  | ({ status: "challenge" } & Challenge)

type Device = {
  server: string
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

type ScanResult = {
  servers: Array<{
    server: string
    homes: unknown[]
    devices: Device[]
    errors: string[]
    homeCount: number
  }>
  devices: Device[]
  totalDevices: number
}

type FirmwareItem = {
  type: "BLE" | "MCU"
  version: string
  url: string
  md5: string | null
  filename: string
}

type FirmwareResult = {
  server: string | null
  items: FirmwareItem[]
  changelog: string
  errors: Array<{ server: string; error: string }>
}

type FirmwareDialogState = {
  open: boolean
  device: Device | null
  loading: boolean
  data: FirmwareResult | null
  error: string | null
}

const API = "/api/admin/token-extractor"

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  })
  const payload = (await response.json().catch(() => ({}))) as {
    success?: boolean
    data?: T
    error?: string
  }
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || `HTTP ${response.status}`)
  }
  return payload.data as T
}

function display(value: string | null | undefined, visible: boolean): string {
  if (!value) return "—"
  if (!visible) return "••••••••••••"
  return value
}

export function TokenExtractorPanel() {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [authMode, setAuthMode] = useState("qr")
  const [qr, setQr] = useState<Challenge | null>(null)
  const [qrPolling, setQrPolling] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [challengeCode, setChallengeCode] = useState("")
  const [loginBusy, setLoginBusy] = useState(false)
  const [servers, setServers] = useState<string[]>([...SERVERS])
  const [pin, setPin] = useState("")
  const [scanning, setScanning] = useState(false)
  const [scan, setScan] = useState<ScanResult | null>(null)
  const [showSecrets, setShowSecrets] = useState(false)
  const [firmware, setFirmware] = useState<FirmwareDialogState>({
    open: false,
    device: null,
    loading: false,
    data: null,
    error: null,
  })
  const [downloading, setDownloading] = useState<string | null>(null)

  const loadSession = useCallback(async () => {
    setSessionLoading(true)
    try {
      const data = await api<SessionInfo>("/session")
      setSession(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo leer la sesión")
    } finally {
      setSessionLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial server-backed load; this is an external subscription, not derived state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession()
  }, [loadSession])

  useEffect(() => {
    if (!qrPolling) return
    const timer = window.setInterval(async () => {
      try {
        const data = await api<LoginResponse>("/login/qr/poll")
        if (data.status === "ok") {
          setQrPolling(false)
          setQr(null)
          setSession({ authenticated: true, userId: data.userId, role: "admin", servers: [...SERVERS] })
          toast.success("Sesión Xiaomi iniciada con QR")
        } else {
          // Keep the last QR image; pending polls only return status/type.
          setQr((current) => ({
            ...current,
            ...data,
            imageDataUrl: data.imageDataUrl ?? current?.imageDataUrl,
            loginUrl: data.loginUrl ?? current?.loginUrl,
          }))
        }
      } catch (error) {
        setQrPolling(false)
        toast.error(error instanceof Error ? error.message : "QR expirado")
      }
    }, 2200)
    return () => window.clearInterval(timer)
  }, [qrPolling])

  async function startQr() {
    setLoginBusy(true)
    setChallenge(null)
    try {
      const data = await api<LoginResponse>("/login/qr/start", { method: "POST", body: "{}" })
      if (data.status === "challenge") {
        setQr(data)
        setQrPolling(true)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el QR")
    } finally {
      setLoginBusy(false)
    }
  }

  function handleLogin(data: LoginResponse) {
    if (data.status === "ok") {
      setChallenge(null)
      setQr(null)
      setQrPolling(false)
      setSession({ authenticated: true, userId: data.userId, role: "admin", servers: [...SERVERS] })
      toast.success("Sesión Xiaomi iniciada")
      return
    }
    setChallenge(data)
    toast.info(data.message || "Verificación adicional requerida")
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault()
    setLoginBusy(true)
    try {
      const data = await api<LoginResponse>("/login/password", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      })
      handleLogin(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login fallido")
    } finally {
      setLoginBusy(false)
    }
  }

  async function submitChallenge(event: React.FormEvent) {
    event.preventDefault()
    if (!challenge) return
    setLoginBusy(true)
    try {
      const endpoint = challenge.type === "captcha" ? "/login/captcha" : "/login/2fa"
      const data = await api<LoginResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify({ code: challengeCode }),
      })
      setChallengeCode("")
      handleLogin(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verificación rechazada")
    } finally {
      setLoginBusy(false)
    }
  }

  async function logoutXiaomi() {
    try {
      await api("/logout", { method: "POST", body: "{}" })
    } catch {
      /* ignore */
    }
    setSession({ authenticated: false, userId: null, role: session?.role ?? "admin", servers: [...SERVERS] })
    setScan(null)
    setQr(null)
    setQrPolling(false)
    toast.success("Sesión Xiaomi cerrada")
  }

  async function scanRegions() {
    if (!servers.length) {
      toast.error("Selecciona al menos una región")
      return
    }
    setScanning(true)
    try {
      const data = await api<ScanResult>("/scan", {
        method: "POST",
        body: JSON.stringify({ servers, pin: pin || undefined }),
      })
      setScan(data)
      toast.success(`Escaneo listo: ${data.totalDevices} dispositivo(s)`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error escaneando regiones")
    } finally {
      setScanning(false)
    }
  }

  async function openFirmware(device: Device) {
    setFirmware({ open: true, device, loading: true, data: null, error: null })
    try {
      const data = await api<FirmwareResult>("/firmware/check", {
        method: "POST",
        body: JSON.stringify({ did: device.did, model: device.model, server: device.server }),
      })
      setFirmware({ open: true, device, loading: false, data, error: null })
    } catch (error) {
      setFirmware({
        open: true,
        device,
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : "Error consultando firmware",
      })
    }
  }

  async function downloadFirmware(item: FirmwareItem) {
    setDownloading(item.filename)
    try {
      const response = await fetch(`${API}/firmware/download`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: item.url, md5: item.md5, filename: item.filename }),
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || `HTTP ${response.status}`)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = item.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success(`Descargado: ${item.filename}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error descargando firmware")
    } finally {
      setDownloading(null)
    }
  }

  async function copyValue(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`${label} copiado`)
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  const authenticated = Boolean(session?.authenticated)
  const totalDevices = scan?.totalDevices ?? 0
  const visibleDevices = useMemo(() => scan?.devices ?? [], [scan])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="warning">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Solo técnicos / admin
            </Badge>
            {authenticated ? <Badge variant="default">Xiaomi conectado</Badge> : null}
          </div>
          <h1 className="text-2xl font-bold text-[#111827]">Token Extractor</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
            Consulta Xiaomi Cloud, escanea regiones y descarga firmware BLE/MCU desde una sesión
            autenticada. Las credenciales no se guardan en disco.
          </p>
        </div>
        {authenticated ? (
          <Button variant="outline" onClick={logoutXiaomi}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión Xiaomi
          </Button>
        ) : null}
      </div>

      {sessionLoading ? (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-[#6b7280]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Comprobando sesión…
          </CardContent>
        </Card>
      ) : !authenticated ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-[#10b981]" />
              Conectar con Xiaomi Cloud
            </CardTitle>
            <CardDescription>
              Usa la misma cuenta de Xiaomi Home. Si tu región es Uruguay, prueba i2, us o deja todas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={setAuthMode}>
              <TabsList>
                <TabsTrigger value="qr">
                  <QrCode className="mr-1 h-4 w-4" />
                  Código QR
                </TabsTrigger>
                <TabsTrigger value="password">
                  <Smartphone className="mr-1 h-4 w-4" />
                  Usuario y contraseña
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qr">
                <div className="grid gap-6 md:grid-cols-[240px_1fr] md:items-center">
                  <div className="flex h-56 w-56 items-center justify-center overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
                    {qr?.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qr.imageDataUrl} alt="QR Xiaomi" className="h-full w-full object-contain" />
                    ) : (
                      <div className="px-6 text-center text-xs text-[#9ca3af]">
                        El QR aparecerá aquí
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-[#374151]">
                      Abre Xiaomi Home en el teléfono y usa el escáner de inicio de sesión.
                    </p>
                    <Button onClick={startQr} disabled={loginBusy}>
                      {loginBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                      Generar QR
                    </Button>
                    {qrPolling ? (
                      <p className="flex items-center gap-2 text-xs text-[#6b7280]">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Esperando escaneo…
                      </p>
                    ) : null}
                    {qr?.loginUrl ? (
                      <a
                        href={qr.loginUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-xs text-[#059669] underline"
                      >
                        Abrir enlace de login
                      </a>
                    ) : null}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="password">
                <form onSubmit={submitPassword} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="xiaomi-username">Usuario Xiaomi</Label>
                    <Input
                      id="xiaomi-username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      autoComplete="username"
                      placeholder="correo o ID de Xiaomi"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="xiaomi-password">Contraseña</Label>
                    <Input
                      id="xiaomi-password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      placeholder="contraseña de Xiaomi"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={loginBusy}>
                      {loginBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      Iniciar sesión
                    </Button>
                  </div>
                </form>
                <p className="mt-3 text-xs text-[#6b7280]">
                  Si la cuenta tiene 2FA o captcha, la app pedirá el paso adicional.
                </p>
              </TabsContent>
            </Tabs>

            {challenge ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-900">
                  {challenge.type === "captcha" ? "Captcha de Xiaomi" : "Verificación en dos pasos"}
                </h3>
                <p className="mt-1 text-xs text-amber-800">{challenge.message}</p>
                {challenge.imageDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={challenge.imageDataUrl}
                    alt="Captcha"
                    className="mt-3 h-20 rounded-md border border-amber-200 bg-white"
                  />
                ) : null}
                <form onSubmit={submitChallenge} className="mt-3 flex flex-wrap gap-2">
                  <Input
                    value={challengeCode}
                    onChange={(event) => setChallengeCode(event.target.value)}
                    placeholder="Código"
                    className="max-w-48"
                    autoComplete="one-time-code"
                    required
                  />
                  <Button type="submit" disabled={loginBusy}>
                    Continuar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setChallenge(null)}>
                    Cancelar
                  </Button>
                </form>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-[#10b981]" />
                    Escanear regiones
                  </CardTitle>
                  <CardDescription>
                    Cuenta: <span className="font-mono text-[#374151]">{session?.userId}</span>. Marca
                    todas o una región concreta.
                  </CardDescription>
                </div>
                <Badge variant="secondary">{scanning ? "Escaneando" : `${totalDevices} dispositivo(s)`}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {SERVERS.map((server) => {
                  const checked = servers.includes(server)
                  return (
                    <label
                      key={server}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        checked
                          ? "border-[#10b981] bg-[#d1fae5] text-[#047857]"
                          : "border-[#e5e7eb] bg-white text-[#6b7280]"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="accent-[#10b981]"
                        checked={checked}
                        onChange={(event) =>
                          setServers((current) =>
                            event.target.checked
                              ? [...new Set([...current, server])]
                              : current.filter((item) => item !== server)
                          )
                        }
                      />
                      {server}
                    </label>
                  )
                })}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="w-full max-w-xs space-y-2">
                  <Label htmlFor="device-pin">PIN del dispositivo (opcional)</Label>
                  <Input
                    id="device-pin"
                    type="password"
                    value={pin}
                    onChange={(event) => setPin(event.target.value)}
                    placeholder="PIN de Xiaomi Home"
                    autoComplete="off"
                  />
                </div>
                <Button onClick={scanRegions} disabled={scanning}>
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Escanear regiones
                </Button>
                <span className="text-xs text-[#6b7280]">
                  Uruguay no es código de servidor: usa i2, us o todas.
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <CardTitle>Dispositivos</CardTitle>
                  <CardDescription>
                    {totalDevices
                      ? `${totalDevices} dispositivo(s) encontrados`
                      : "Sin dispositivos escaneados todavía."}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSecrets((value) => !value)}
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showSecrets ? "Ocultar secretos" : "Mostrar secretos"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!scan ? (
                <p className="text-sm text-[#6b7280]">
                  Ejecuta un escaneo para listar los dispositivos de la cuenta.
                </p>
              ) : null}
              {scan?.servers.map((entry) => (
                <div key={entry.server} className="rounded-xl border border-[#e5e7eb]">
                  <div className="flex items-center justify-between gap-3 border-b border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
                    <span className="text-sm font-semibold uppercase tracking-wide text-[#111827]">
                      {entry.server}
                    </span>
                    <Badge variant="secondary">
                      {entry.devices.length} dispositivo(s) · {entry.homeCount} hogar(es)
                    </Badge>
                  </div>
                  <div className="space-y-3 p-4">
                    {entry.errors.map((error) => (
                      <div
                        key={error}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
                      >
                        {error}
                      </div>
                    ))}
                    {entry.devices.length === 0 ? (
                      <p className="text-sm text-[#6b7280]">Sin dispositivos en esta región.</p>
                    ) : null}
                    {entry.devices.map((device) => (
                      <div key={`${entry.server}:${device.did}`} className="rounded-xl border border-[#e5e7eb] p-4">
                        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                          <div>
                            <p className="font-semibold text-[#111827]">{device.name}</p>
                            <p className="text-xs text-[#059669]">{device.model || "modelo desconocido"}</p>
                          </div>
                          <Badge variant="secondary">{device.server}</Badge>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <Meta label="DID" value={device.did} />
                          <Meta label="MAC" value={device.mac} />
                          <Meta label="IP" value={device.localip} />
                          <Meta label="Token" value={display(device.token, showSecrets)} mono />
                          <Meta label="BLE key" value={display(device.bleKey, showSecrets)} mono />
                          <Meta
                            label="LTMK"
                            value={
                              device.ltmkStatus === "pin_required"
                                ? "PIN requerido"
                                : display(device.ltmk, showSecrets)
                            }
                            mono
                          />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => copyValue(device.did, "DID")}>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar DID
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!device.token}
                            onClick={() => copyValue(device.token, "Token")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Token
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!device.bleKey}
                            onClick={() => copyValue(device.bleKey ?? "", "BLE key")}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            BLE key
                          </Button>
                          <Button size="sm" onClick={() => openFirmware(device)}>
                            <Download className="h-3.5 w-3.5" />
                            Ver firmware
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {scan && visibleDevices.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  No se encontraron dispositivos. Revisa la cuenta, la región o si el scooter está en
                  un hogar compartido. Prueba i2, us o todas las regiones.
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog
        open={firmware.open}
        onOpenChange={(open) => setFirmware((current) => ({ ...current, open }))}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-[#10b981]" />
              Firmware · {firmware.device?.name ?? "Dispositivo"}
            </DialogTitle>
            <DialogDescription>
              {firmware.device?.model} · {firmware.device?.did}
            </DialogDescription>
          </DialogHeader>
          {firmware.loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-[#6b7280]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Consultando Xiaomi Cloud…
            </div>
          ) : null}
          {firmware.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {firmware.error}
            </div>
          ) : null}
          {firmware.data?.items.length === 0 ? (
            <div className="space-y-2 py-4 text-sm text-[#6b7280]">
              <p>No se encontró firmware descargable para este dispositivo.</p>
              {firmware.data.errors.map((error) => (
                <p key={`${error.server}:${error.error}`} className="text-xs text-red-600">
                  {error.server}: {error.error}
                </p>
              ))}
            </div>
          ) : null}
          {firmware.data?.items.map((item) => (
            <div key={item.filename} className="mt-3 rounded-xl border border-[#e5e7eb] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold tracking-wide text-[#059669]">{item.type}</p>
                  <p className="text-lg font-semibold text-[#111827]">v{item.version}</p>
                </div>
                <Badge variant="secondary">{firmware.data?.server ?? firmware.device?.server}</Badge>
              </div>
              <div className="mt-3 space-y-1 text-xs">
                <p className="text-[#6b7280]">
                  MD5: <span className="font-mono text-[#374151]">{item.md5 ?? "no informado"}</span>
                </p>
                <p className="text-[#6b7280]">
                  Archivo: <span className="font-mono text-[#374151]">{item.filename}</span>
                </p>
                <p className="break-all text-[#6b7280]">
                  URL: <span className="font-mono text-[#374151]">{item.url}</span>
                </p>
              </div>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => downloadFirmware(item)}
                disabled={downloading === item.filename}
              >
                {downloading === item.filename ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Descargar {item.type}
              </Button>
            </div>
          ))}
          {firmware.data?.changelog ? (
            <pre className="mt-4 whitespace-pre-wrap rounded-lg bg-[#f9fafb] p-3 text-xs text-[#4b5563]">
              {firmware.data.changelog}
            </pre>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-3 text-xs text-[#6b7280]">
        <Check className="h-3.5 w-3.5 text-[#10b981]" />
        La sesión Xiaomi vive en una cookie cifrada HTTPOnly. El token y las claves solo se muestran
        cuando activas “Mostrar secretos”.
      </div>
    </div>
  )
}

function Meta({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9ca3af]">{label}</p>
      <p className={cn("break-all text-xs text-[#374151]", mono && "font-mono")}>{value}</p>
    </div>
  )
}
