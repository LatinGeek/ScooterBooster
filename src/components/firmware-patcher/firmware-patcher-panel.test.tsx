// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type {
  DetectResponse,
  FirmwarePatcherCapabilities,
  PatchCapability,
  PatchLogEntry,
} from "./api-types"
import { FirmwarePatcherPanel } from "./firmware-patcher-panel"

const SHA_IN = "a".repeat(64)
const SHA_OUT = "b".repeat(64)

const speed = (code: "sls" | "sld", def: number): PatchCapability => ({
  code,
  status: "supported",
  kind: "number",
  min: 1,
  max: 35,
  step: 0.1,
  default: def,
})

const MI6_PATCHES: PatchCapability[] = [
  speed("sls", 25),
  speed("sld", 15),
  { code: "slp", status: "supported", kind: "number", min: 1, max: 35, step: 0.1, default: 6 },
  { code: "mss", status: "experimental", kind: "number", min: 1, max: 9, step: 0.1, default: 5 },
  { code: "mss0exp", status: "experimental", kind: "boolean" },
  { code: "cce", status: "unsupported", kind: "boolean" },
]

const MI4_PATCHES: PatchCapability[] = [
  speed("sls", 25),
  { code: "fdv", status: "supported", kind: "version", default: "0000" },
  { code: "cce", status: "supported", kind: "boolean" },
  // A buggy/stale server entry: must never surface for non-Mi6 models.
  { code: "mss0exp", status: "experimental", kind: "boolean" },
]

const CAPABILITIES: FirmwarePatcherCapabilities = {
  enabled: true,
  upstream: { version: "1.1.6", commit: "95a8f339787a1fb6486554d61b573b8e2b688c53" },
  limits: { maxInputBytes: 4 * 1024 * 1024, maxOutputBytes: 8 * 1024 * 1024, maxPatches: 8 },
  models: [],
}

function detection(model: string, displayName: string, patches: PatchCapability[]): DetectResponse {
  return {
    detection: {
      ok: true,
      model,
      displayName,
      family: "n32",
      container: "leqi",
      score: 92,
      hits: ["Etiqueta EU1 en el encabezado", "Tamaño de imagen coincide"],
      notes: [],
      supported: true,
    },
    availablePatches: patches,
  }
}

const UNSUPPORTED: DetectResponse = {
  detection: {
    ok: false,
    model: null,
    displayName: null,
    family: null,
    container: null,
    score: 12,
    hits: [],
    notes: ["Puntaje por debajo del mínimo"],
    supported: false,
  },
  availablePatches: [],
}

function envelope(data: unknown, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { "content-type": "application/json" },
  })
}
function errorEnvelope(error: string, status: number) {
  return new Response(JSON.stringify({ success: false, error }), {
    status,
    headers: { "content-type": "application/json", "x-request-id": "req-123" },
  })
}

interface ApiMock {
  detect: () => Response
  patch: () => Response
  capabilities?: () => Response
}

let fetchMock: ReturnType<typeof vi.fn>

function installApi(api: ApiMock) {
  fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/capabilities")) return api.capabilities?.() ?? envelope(CAPABILITIES)
    if (url.endsWith("/detect")) return api.detect()
    if (url.endsWith("/patch")) return api.patch()
    throw new Error(`unexpected url ${url}`)
  })
  vi.stubGlobal("fetch", fetchMock)
}

function patchedResponse(log: PatchLogEntry[] = [{ name: "sls", offset: 4660, before: "1a00", after: "2300" }]) {
  return new Response(new Uint8Array([1, 2, 3, 4]), {
    status: 200,
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": 'attachment; filename="patched_mi6_firmware.bin"',
      "x-firmware-model": "mi6",
      "x-firmware-input-sha256": SHA_IN,
      "x-firmware-output-sha256": SHA_OUT,
      "x-firmware-input-size": "1024",
      "x-firmware-output-size": "4",
      "x-firmware-patch-log": Buffer.from(JSON.stringify(log)).toString("base64url"),
    },
  })
}

function makeFile(name = "firmware.bin", size = 1024) {
  return new File([new Uint8Array(size).fill(7)], name, { type: "application/octet-stream" })
}

async function uploadAndAnalyze(file = makeFile()) {
  const input = await screen.findByLabelText("Archivo de firmware (.bin)")
  fireEvent.change(input, { target: { files: [file] } })
  fireEvent.click(await screen.findByRole("button", { name: /Analizar firmware/ }))
  await screen.findByTestId("firmware-detection-card")
}

async function renderReady(role: "admin" | "technician" = "admin") {
  render(<FirmwarePatcherPanel role={role} />)
  await screen.findByLabelText("Archivo de firmware (.bin)")
}

function lastPatchForm(): FormData {
  const call = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/patch")).at(-1)
  return (call?.[1] as RequestInit).body as FormData
}

describe("FirmwarePatcherPanel", () => {
  let anchorDownloads: string[]

  beforeEach(() => {
    anchorDownloads = []
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() }))
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      anchorDownloads.push(this.download)
    })
    installApi({ detect: () => envelope(detection("mi6", "Mi 6", MI6_PATCHES)), patch: () => patchedResponse() })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("shows a persistent, non-blocking operational warning and no disclaimer gate", async () => {
    await renderReady()
    const warning = screen.getByTestId("firmware-operational-warning")
    expect(warning.textContent).toMatch(/inutilizable/)
    expect(warning.textContent).toMatch(/no lo instala ni lo flashea/)
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.queryByRole("alertdialog")).toBeNull()
    expect(screen.queryByRole("checkbox", { name: /acepto|disclaimer|aviso legal/i })).toBeNull()
    expect((screen.getByLabelText("Archivo de firmware (.bin)") as HTMLInputElement).disabled).toBe(false)
    // Still visible after interacting with the tool.
    await uploadAndAnalyze()
    expect(screen.getByTestId("firmware-operational-warning")).toBeTruthy()
  })

  it("renders role badge, limitations and a keyboard-reachable file input", async () => {
    await renderReady("technician")
    expect(screen.getByTestId("firmware-role-badge").textContent).toBe("Técnico")
    expect(screen.getByRole("heading", { level: 1, name: "Parcheador de firmware" })).toBeTruthy()
    expect(screen.getByTestId("firmware-limitations").textContent).toMatch(/1\.1\.6/)
    const input = screen.getByLabelText("Archivo de firmware (.bin)") as HTMLInputElement
    expect(input.tabIndex).not.toBe(-1)
    expect(input.accept).toContain(".bin")
  })

  it("validates uploads: extension, empty, oversize and multiple files", async () => {
    await renderReady()
    const input = screen.getByLabelText("Archivo de firmware (.bin)")

    fireEvent.change(input, { target: { files: [makeFile("firmware.txt")] } })
    expect((await screen.findByTestId("firmware-error")).textContent).toMatch(/extensión \.bin/)

    fireEvent.change(input, { target: { files: [makeFile("empty.bin", 0)] } })
    expect((await screen.findByTestId("firmware-error")).textContent).toMatch(/vacío/)

    fireEvent.change(input, { target: { files: [makeFile("big.bin", 4 * 1024 * 1024 + 1)] } })
    expect((await screen.findByTestId("firmware-error")).textContent).toMatch(/máximo es 4\.00 MiB/)

    fireEvent.change(input, { target: { files: [makeFile("a.bin"), makeFile("b.bin")] } })
    expect((await screen.findByTestId("firmware-error")).textContent).toMatch(/único archivo/)

    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/detect"))).toBe(false)
  })

  it("accepts a valid .bin, shows name and size, and lets the user clear it", async () => {
    await renderReady()
    const input = screen.getByLabelText("Archivo de firmware (.bin)")
    fireEvent.change(input, { target: { files: [makeFile("stock.bin", 2048)] } })
    expect((await screen.findByTestId("firmware-file-name")).textContent).toBe("stock.bin")
    expect(screen.getByText("2.0 KiB")).toBeTruthy()
    const analyze = screen.getByRole("button", { name: /Analizar firmware/ }) as HTMLButtonElement
    expect(analyze.disabled).toBe(false)

    fireEvent.click(screen.getByRole("button", { name: /Quitar/ }))
    expect(screen.queryByTestId("firmware-file-name")).toBeNull()
    expect((screen.getByRole("button", { name: /Analizar firmware/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("shows the detected model with reasons and only the patches the server offers", async () => {
    await renderReady()
    await uploadAndAnalyze()
    expect(screen.getByTestId("firmware-detected-model").textContent).toBe("Mi 6")
    expect(screen.getByText("Etiqueta EU1 en el encabezado")).toBeTruthy()
    expect(screen.getByRole("checkbox", { name: /Límite de velocidad en modo Sport/ })).toBeTruthy()
    expect(screen.getByRole("checkbox", { name: /Límite de velocidad en modo peatón/ })).toBeTruthy()
    // Marked unsupported for this model => hidden.
    expect(screen.queryByRole("checkbox", { name: /Control de crucero/ })).toBeNull()
    // Not offered for this model => hidden.
    expect(screen.queryByRole("checkbox", { name: /Versión de firmware falsa/ })).toBeNull()
  })

  it("shows the unsupported state without any patch form", async () => {
    installApi({ detect: () => envelope(UNSUPPORTED), patch: () => patchedResponse() })
    await renderReady()
    await uploadAndAnalyze()
    expect(screen.getByTestId("firmware-unsupported").textContent).toMatch(/No se pudo detectar el modelo/)
    expect(screen.queryByTestId("firmware-patch-form")).toBeNull()
    expect(screen.getByText("Puntaje por debajo del mínimo")).toBeTruthy()
  })

  it("does not render the MSS0 checkbox for models other than mi6/mi6lite", async () => {
    installApi({ detect: () => envelope(detection("mi4", "Electric Scooter 4", MI4_PATCHES)), patch: () => patchedResponse() })
    await renderReady()
    await uploadAndAnalyze()
    expect(screen.queryByTestId("firmware-field-mss0exp")).toBeNull()
    expect(screen.getByRole("checkbox", { name: /Versión de firmware falsa/ })).toBeTruthy()
  })

  it("syncs slider and numeric input and validates ranges", async () => {
    await renderReady()
    await uploadAndAnalyze()
    fireEvent.click(screen.getByRole("checkbox", { name: /Límite de velocidad en modo Sport/ }))
    const slider = screen.getByRole("slider", { name: /Sport: deslizador/ }) as HTMLInputElement
    const number = screen.getByRole("spinbutton", { name: /Sport: valor/ }) as HTMLInputElement
    expect(number.value).toBe("25")
    fireEvent.change(slider, { target: { value: "30.5" } })
    expect(number.value).toBe("30.5")

    fireEvent.change(number, { target: { value: "99" } })
    expect(screen.getByText(/entre 1 y 35/)).toBeTruthy()
    expect((screen.getByRole("button", { name: /Aplicar parches/ }) as HTMLButtonElement).disabled).toBe(true)
  })

  it("requires explicit acknowledgment for experimental patches and sends allowExperimental", async () => {
    await renderReady()
    await uploadAndAnalyze()
    const apply = () => screen.getByRole("button", { name: /Aplicar parches/ }) as HTMLButtonElement

    expect(apply().disabled).toBe(true) // nothing selected
    fireEvent.click(screen.getByRole("checkbox", { name: /Velocidad de arranque del motor/ }))
    expect(screen.getByTestId("firmware-experimental-warning")).toBeTruthy()
    const ack = screen.getByRole("checkbox", { name: /Entiendo que los parches experimentales/ }) as HTMLInputElement
    expect(ack.checked).toBe(false) // never pre-checked
    expect(apply().disabled).toBe(true)

    fireEvent.click(ack)
    expect(apply().disabled).toBe(false)
    fireEvent.click(apply())
    await screen.findByTestId("firmware-result-card")
    const form = lastPatchForm()
    expect(form.get("allowExperimental")).toBe("true")
    expect(JSON.parse(String(form.get("selection")))).toEqual([{ code: "mss", value: 5 }])
  })

  it("sends allowExperimental=false for stable-only selections", async () => {
    await renderReady()
    await uploadAndAnalyze()
    fireEvent.click(screen.getByRole("checkbox", { name: /Límite de velocidad en modo Sport/ }))
    expect(screen.queryByTestId("firmware-experimental-warning")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /Aplicar parches/ }))
    await screen.findByTestId("firmware-result-card")
    const form = lastPatchForm()
    expect(form.get("allowExperimental")).toBe("false")
    expect(form.get("fullDump")).toBe("false")
    expect(form.get("file")).toBeTruthy()
  })

  it.each(["admin", "technician"] as const)("offers full dump to the %s role", async (role) => {
    await renderReady(role)
    await uploadAndAnalyze()
    const toggle = screen.getByRole("switch", { name: /Volcado completo/ }) as HTMLInputElement
    expect(toggle.checked).toBe(false)
    expect(screen.queryByTestId("firmware-full-dump-warning")).toBeNull()
    fireEvent.click(toggle)
    expect(screen.getByTestId("firmware-full-dump-warning").textContent).toMatch(/checksum no se recalcula/)

    fireEvent.click(screen.getByRole("checkbox", { name: /Límite de velocidad en modo Drive/ }))
    fireEvent.click(screen.getByRole("button", { name: /Aplicar parches/ }))
    await screen.findByTestId("firmware-result-card")
    expect(lastPatchForm().get("fullDump")).toBe("true")
    expect(screen.getByText("Volcado completo")).toBeTruthy()
  })

  it("MSS0 checkbox locks the MSS control, explains why and omits mss from the request", async () => {
    await renderReady("technician")
    await uploadAndAnalyze()
    const mss = screen.getByRole("checkbox", { name: /Velocidad de arranque del motor/ }) as HTMLInputElement
    fireEvent.click(mss)
    expect(mss.checked).toBe(true)

    fireEvent.click(screen.getByRole("checkbox", { name: /Arranque MSS0 experimental/ }))
    expect(mss.disabled).toBe(true)
    expect(mss.checked).toBe(false)
    expect((screen.getByRole("slider", { name: /arranque del motor: deslizador/ }) as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByTestId("firmware-mss-locked").textContent).toMatch(/reemplaza este valor/)

    fireEvent.click(screen.getByRole("checkbox", { name: /Entiendo que los parches experimentales/ }))
    fireEvent.click(screen.getByRole("button", { name: /Aplicar parches/ }))
    await screen.findByTestId("firmware-result-card")
    const selection = JSON.parse(String(lastPatchForm().get("selection"))) as Array<{ code: string; value: unknown }>
    expect(selection).toEqual([{ code: "mss0exp", value: true }])
    expect(lastPatchForm().get("allowExperimental")).toBe("true")
  })

  it("shows the result card and downloads with the server filename", async () => {
    await renderReady()
    await uploadAndAnalyze()
    fireEvent.click(screen.getByRole("checkbox", { name: /Límite de velocidad en modo Sport/ }))
    fireEvent.click(screen.getByRole("button", { name: /Aplicar parches/ }))
    const card = await screen.findByTestId("firmware-result-card")
    expect(within(card).getByText(SHA_IN)).toBeTruthy()
    expect(within(card).getByText(SHA_OUT)).toBeTruthy()
    expect(within(card).getByText("Mi 6")).toBeTruthy()
    expect(within(card).getByText("1.0 KiB")).toBeTruthy()
    const table = within(card).getByRole("table")
    expect(within(table).getByText("0x001234")).toBeTruthy()
    expect(within(card).getByRole("region", { name: /Registro de parches aplicados/ }).className).toMatch(/overflow-x-auto/)

    fireEvent.click(within(card).getByRole("button", { name: /Descargar patched_mi6_firmware\.bin/ }))
    expect(anchorDownloads).toEqual(["patched_mi6_firmware.bin"])
  })

  it("resets everything with 'Parchear otro archivo'", async () => {
    await renderReady()
    await uploadAndAnalyze()
    fireEvent.click(screen.getByRole("checkbox", { name: /Límite de velocidad en modo Sport/ }))
    fireEvent.click(screen.getByRole("button", { name: /Aplicar parches/ }))
    await screen.findByTestId("firmware-result-card")
    fireEvent.click(screen.getByRole("button", { name: /Parchear otro archivo/ }))
    expect(screen.queryByTestId("firmware-result-card")).toBeNull()
    expect(screen.queryByTestId("firmware-detection-card")).toBeNull()
    expect(screen.queryByTestId("firmware-file-name")).toBeNull()
  })

  it.each([
    [413, "El archivo es demasiado grande.", /Archivo demasiado grande/],
    [429, "Demasiadas solicitudes.", /Demasiados intentos/],
    [400, "No se encontró la firma esperada para el parche sls.", /No se encontró la firma esperada/],
    [400, "Los bytes MSS0 no coinciden con el estado esperado.", /MSS0 no es compatible/],
    [400, "Falta confirmar parches experimentales.", /confirmar los parches experimentales/],
    [422, "No se pudo detectar el modelo del firmware.", /Modelo no soportado/],
  ])("maps patch error %i to actionable Spanish copy without leaking internals", async (status, message, title) => {
    installApi({
      detect: () => envelope(detection("mi6", "Mi 6", MI6_PATCHES)),
      patch: () => errorEnvelope(message, status),
    })
    await renderReady()
    await uploadAndAnalyze()
    fireEvent.click(screen.getByRole("checkbox", { name: /Límite de velocidad en modo Sport/ }))
    fireEvent.click(screen.getByRole("button", { name: /Aplicar parches/ }))
    const alert = await screen.findByTestId("firmware-error")
    expect(alert.getAttribute("role")).toBe("alert")
    expect(alert.textContent).toMatch(title)
    expect(alert.textContent).not.toMatch(/stack|node_modules|TypeError/)
    // The form stays usable so the user can adjust and retry.
    expect((screen.getByRole("button", { name: /Aplicar parches/ }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByTestId("firmware-result-card")).toBeNull()
  })

  it("never renders stack traces from the server", async () => {
    installApi({
      detect: () => errorEnvelope("TypeError: boom\n    at run (C:/repo/src/lib/x.ts:1:1)", 500),
      patch: () => patchedResponse(),
    })
    await renderReady()
    const input = screen.getByLabelText("Archivo de firmware (.bin)")
    fireEvent.change(input, { target: { files: [makeFile()] } })
    fireEvent.click(await screen.findByRole("button", { name: /Analizar firmware/ }))
    const alert = await screen.findByTestId("firmware-error")
    expect(alert.textContent).not.toMatch(/TypeError|at run|src\/lib/)
    expect(alert.textContent).toMatch(/req-123/)
  })

  it("never stores firmware in web storage", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    await renderReady()
    await uploadAndAnalyze()
    fireEvent.click(screen.getByRole("checkbox", { name: /Límite de velocidad en modo Sport/ }))
    fireEvent.click(screen.getByRole("button", { name: /Aplicar parches/ }))
    await screen.findByTestId("firmware-result-card")
    expect(setItem).not.toHaveBeenCalled()
    expect(window.localStorage.length).toBe(0)
    expect(window.sessionStorage.length).toBe(0)
  })

  it("passes an AbortSignal to every request and aborts on unmount", async () => {
    let detectSignal: AbortSignal | undefined
    fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/capabilities")) return envelope(CAPABILITIES)
      detectSignal = init?.signal ?? undefined
      return new Promise<Response>(() => {}) // never resolves
    })
    vi.stubGlobal("fetch", fetchMock)
    const { unmount } = render(<FirmwarePatcherPanel role="admin" />)
    const input = await screen.findByLabelText("Archivo de firmware (.bin)")
    fireEvent.change(input, { target: { files: [makeFile()] } })
    fireEvent.click(await screen.findByRole("button", { name: /Analizar firmware/ }))
    await waitFor(() => expect(detectSignal).toBeTruthy())
    expect(detectSignal?.aborted).toBe(false)
    unmount()
    expect(detectSignal?.aborted).toBe(true)
  })

  it("announces progress through a polite live region and focuses the detection heading", async () => {
    await renderReady()
    const live = screen.getByTestId("firmware-live")
    expect(live.getAttribute("aria-live")).toBe("polite")
    await uploadAndAnalyze()
    await waitFor(() => expect(live.textContent).toMatch(/Modelo detectado: Mi 6/))
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByRole("heading", { name: /2\. Modelo detectado/ }))
    )
  })

  it("explains when the feature is disabled or capabilities fail, with retry", async () => {
    installApi({
      detect: () => envelope(UNSUPPORTED),
      patch: () => patchedResponse(),
      capabilities: () => errorEnvelope("No encontrado", 404),
    })
    render(<FirmwarePatcherPanel role="admin" />)
    expect((await screen.findByRole("alert")).textContent).toMatch(/Herramienta deshabilitada/)
    expect(screen.getByRole("button", { name: /Reintentar/ })).toBeTruthy()
    // The persistent warning is still there.
    expect(screen.getByTestId("firmware-operational-warning")).toBeTruthy()
  })
})
