"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CircleAlert, Cpu, Info, Loader2, RefreshCw, ScanSearch } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import type {
  DetectResponse,
  FirmwarePatcherCapabilities,
  PatchCapability,
  PatchResult,
} from "./api-types"
import {
  DEFAULT_MAX_INPUT_BYTES,
  FirmwarePatcherError,
  detectFirmware,
  errorInfo,
  fetchCapabilities,
  isAbortError,
  patchFirmware,
  type FirmwareErrorInfo,
} from "./client"
import { DetectionCard } from "./detection-card"
import { OperationalWarning } from "./operational-warning"
import { PatchForm } from "./patch-form"
import {
  createInitialPatchFormState,
  evaluatePatchForm,
  visiblePatches,
  type PatchFormState,
} from "./patch-form-state"
import { ResultCard } from "./result-card"
import { UploadDropzone, formatBytes } from "./upload-dropzone"

export type FirmwarePatcherRole = "admin" | "technician"

interface FirmwarePatcherPanelProps {
  role: FirmwarePatcherRole
}

type CapabilitiesState =
  | { status: "loading" }
  | { status: "ready"; data: FirmwarePatcherCapabilities }
  | { status: "error"; info: FirmwareErrorInfo }

type Phase = "idle" | "detecting" | "detected" | "patching" | "patched"

interface AppliedSummary {
  fullDump: boolean
  experimental: boolean
}

function toErrorInfo(error: unknown): FirmwareErrorInfo {
  return error instanceof FirmwarePatcherError ? error.info : errorInfo("server")
}

export function FirmwarePatcherPanel({ role }: FirmwarePatcherPanelProps) {
  const [capabilities, setCapabilities] = useState<CapabilitiesState>({ status: "loading" })
  const [capabilitiesAttempt, setCapabilitiesAttempt] = useState(0)
  const [file, setFile] = useState<File | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [detect, setDetect] = useState<DetectResponse | null>(null)
  const [form, setForm] = useState<PatchFormState>(() => createInitialPatchFormState([]))
  const [result, setResult] = useState<PatchResult | null>(null)
  const [applied, setApplied] = useState<AppliedSummary>({ fullDump: false, experimental: false })
  const [error, setError] = useState<FirmwareErrorInfo | null>(null)
  const [liveMessage, setLiveMessage] = useState("")

  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const errorRef = useRef<HTMLDivElement | null>(null)
  const detectionHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null)

  const maxBytes =
    capabilities.status === "ready" ? capabilities.data.limits.maxInputBytes : DEFAULT_MAX_INPUT_BYTES
  const busy = phase === "detecting" || phase === "patching"

  const beginRequest = useCallback((): AbortSignal => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    return controller.signal
  }, [])

  // Load the capability matrix once (and on retry). Firmware never touches this path.
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      try {
        const data = await fetchCapabilities(controller.signal)
        setCapabilities({ status: "ready", data })
      } catch (caught) {
        if (isAbortError(caught)) return
        setCapabilities({ status: "error", info: toErrorInfo(caught) })
      }
    })()
    return () => controller.abort()
  }, [capabilitiesAttempt])

  // Abort any in-flight request on unmount.
  useEffect(() => () => abortRef.current?.abort(), [])

  // Focus management: move focus to the newest result/error so keyboard + AT users land on it.
  useEffect(() => {
    if (phase === "detected") detectionHeadingRef.current?.focus()
    if (phase === "patched") resultHeadingRef.current?.focus()
  }, [phase])
  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])

  const patches: PatchCapability[] = useMemo(() => {
    if (!detect) return []
    const modelCode = detect.detection.model
    const fallback =
      capabilities.status === "ready"
        ? (capabilities.data.models.find((model) => model.code === modelCode)?.patches ?? [])
        : []
    const source = detect.availablePatches.length > 0 ? detect.availablePatches : fallback
    return detect.detection.ok && detect.detection.supported ? visiblePatches(source, modelCode) : []
  }, [detect, capabilities])

  function reportError(info: FirmwareErrorInfo) {
    setError(info)
    setLiveMessage(info.title)
    toast.error(info.title)
  }

  function resetResults() {
    setDetect(null)
    setResult(null)
    setError(null)
    setForm(createInitialPatchFormState([]))
    setApplied({ fullDump: false, experimental: false })
  }

  function clearFile() {
    abortRef.current?.abort()
    setFile(null)
    setPhase("idle")
    resetResults()
    setLiveMessage("Archivo quitado.")
    inputRef.current?.focus()
  }

  function acceptFiles(files: File[]) {
    abortRef.current?.abort()
    resetResults()
    setPhase("idle")
    setFile(null)

    if (files.length !== 1) {
      reportError(
        errorInfo("invalid_file", files.length === 0 ? "No se seleccionó ningún archivo." : "Seleccioná un único archivo.")
      )
      return
    }
    const candidate = files[0] as File
    if (!/\.bin$/i.test(candidate.name)) {
      reportError(errorInfo("invalid_file", "El archivo debe tener extensión .bin."))
      return
    }
    if (candidate.size === 0) {
      reportError(errorInfo("invalid_file", "El archivo está vacío."))
      return
    }
    if (candidate.size > maxBytes) {
      reportError(errorInfo("size", `El archivo pesa ${formatBytes(candidate.size)} y el máximo es ${formatBytes(maxBytes)}.`))
      return
    }
    setFile(candidate)
    setLiveMessage(`Archivo seleccionado: ${candidate.name}, ${formatBytes(candidate.size)}.`)
  }

  async function analyze() {
    if (!file) return
    const signal = beginRequest()
    resetResults()
    setPhase("detecting")
    setLiveMessage("Analizando firmware…")
    try {
      const response = await detectFirmware(file, signal)
      const initialPatches =
        response.detection.ok && response.detection.supported
          ? visiblePatches(
              response.availablePatches.length > 0
                ? response.availablePatches
                : capabilities.status === "ready"
                  ? (capabilities.data.models.find((model) => model.code === response.detection.model)?.patches ?? [])
                  : [],
              response.detection.model
            )
          : []
      setDetect(response)
      setForm(createInitialPatchFormState(initialPatches))
      setPhase("detected")
      setLiveMessage(
        response.detection.ok && response.detection.supported
          ? `Modelo detectado: ${response.detection.displayName ?? response.detection.model}.`
          : "No se pudo detectar un modelo compatible."
      )
    } catch (caught) {
      if (isAbortError(caught)) return
      setPhase("idle")
      reportError(toErrorInfo(caught))
    }
  }

  async function applyPatches() {
    if (!file || !detect) return
    const evaluation = evaluatePatchForm(patches, form)
    if (evaluation.selection.length === 0 || Object.keys(evaluation.fieldErrors).length > 0) return
    if (evaluation.hasExperimental && !form.acknowledged) {
      reportError(errorInfo("experimental"))
      return
    }
    const signal = beginRequest()
    setError(null)
    setPhase("patching")
    setLiveMessage("Aplicando parches…")
    try {
      const patched = await patchFirmware(
        {
          file,
          selection: evaluation.selection,
          allowExperimental: evaluation.hasExperimental && form.acknowledged,
          fullDump: form.fullDump,
        },
        signal
      )
      setResult(patched)
      setApplied({ fullDump: form.fullDump, experimental: evaluation.hasExperimental })
      setPhase("patched")
      setLiveMessage(`Firmware parcheado: ${patched.filename}.`)
      toast.success("Firmware parcheado correctamente")
    } catch (caught) {
      if (isAbortError(caught)) {
        setPhase("detected")
        setLiveMessage("Operación cancelada.")
        return
      }
      setPhase("detected")
      reportError(toErrorInfo(caught))
    }
  }

  function cancelRequest() {
    abortRef.current?.abort()
    setPhase(detect ? "detected" : "idle")
    setLiveMessage("Operación cancelada.")
  }

  function download() {
    if (!result) return
    const url = URL.createObjectURL(result.blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = result.filename
    anchor.rel = "noopener"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  function patchAnother() {
    abortRef.current?.abort()
    setFile(null)
    setPhase("idle")
    resetResults()
    setLiveMessage("Listo para un nuevo archivo.")
    inputRef.current?.focus()
  }

  const detection = detect?.detection ?? null
  const showForm = phase !== "idle" && phase !== "detecting" && patches.length > 0
  const modelLabel = detection?.displayName ?? detection?.model ?? "—"
  const roleLabel = role === "admin" ? "Administrador" : "Técnico"

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 space-y-6" data-testid="firmware-patcher-panel">
      <header className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d1fae5] text-[#059669]">
            <Cpu className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-bold text-[#111827]">Parcheador de firmware</h1>
            <p className="mt-1 text-sm text-[#6b7280]">
              Detecta el modelo de un firmware Brightway (.bin) y genera una copia modificada para descargar.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default" data-testid="firmware-role-badge">
            {roleLabel}
          </Badge>
          <Badge variant="secondary">Herramienta interna</Badge>
          <Badge variant="warning">Experimental</Badge>
        </div>
      </header>

      <OperationalWarning />

      {capabilities.status === "loading" ? (
        <p className="flex items-center gap-2 text-sm text-[#6b7280]" data-testid="firmware-capabilities-loading">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Cargando capacidades del parcheador…
        </p>
      ) : null}

      {capabilities.status === "error" ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <CircleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{capabilities.info.title}</p>
            <p>{capabilities.info.hint}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setCapabilities({ status: "loading" })
              setCapabilitiesAttempt((n) => n + 1)
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      ) : null}

      {capabilities.status === "ready" && !capabilities.data.enabled ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{errorInfo("disabled").title}</p>
          <p>{errorInfo("disabled").hint}</p>
        </div>
      ) : null}

      {capabilities.status === "ready" && capabilities.data.enabled ? (
        <>
          <Card>
            <CardHeader>
              <h2 className="text-xl leading-tight font-semibold text-[#111827]">1. Archivo de firmware</h2>
              <CardDescription>
                El archivo se procesa en memoria en el servidor y no se guarda. Se admite un único .bin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <UploadDropzone
                ref={inputRef}
                file={file}
                maxBytes={maxBytes}
                disabled={busy}
                errorId={error && !detect ? "firmware-error" : undefined}
                invalid={Boolean(error && !detect)}
                onFiles={acceptFiles}
                onClear={clearFile}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" onClick={() => void analyze()} disabled={!file || busy}>
                  {phase === "detecting" ? (
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  ) : (
                    <ScanSearch className="h-4 w-4" aria-hidden="true" />
                  )}
                  {phase === "detecting" ? "Analizando…" : "Analizar firmware"}
                </Button>
                {phase === "detecting" ? (
                  <Button type="button" variant="outline" onClick={cancelRequest}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {error ? (
            <div
              ref={errorRef}
              id="firmware-error"
              role="alert"
              tabIndex={-1}
              data-testid="firmware-error"
              className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 focus:ring-2 focus:ring-red-400 focus:outline-none"
            >
              <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold">{error.title}</p>
                <p>{error.message}</p>
                <p className="text-red-700">{error.hint}</p>
              </div>
            </div>
          ) : null}

          {phase !== "idle" ? (
            <DetectionCard ref={detectionHeadingRef} loading={phase === "detecting"} detection={detection} />
          ) : null}

          {showForm ? (
            <PatchForm
              patches={patches}
              state={form}
              applying={phase === "patching"}
              onChange={setForm}
              onSubmit={() => void applyPatches()}
              onCancel={cancelRequest}
            />
          ) : null}

          {phase === "patched" && result ? (
            <ResultCard
              ref={resultHeadingRef}
              result={result}
              modelLabel={modelLabel}
              fullDump={applied.fullDump}
              experimental={applied.experimental}
              onDownload={download}
              onReset={patchAnother}
            />
          ) : null}
        </>
      ) : null}

      <section
        aria-label="Limitaciones"
        data-testid="firmware-limitations"
        className="flex gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4 text-sm text-[#6b7280]"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#6b7280]" aria-hidden="true" />
        <ul className="list-disc space-y-1 pl-4">
          <li>El resultado es una imagen modificada no oficial: no está firmada ni validada por el fabricante.</li>
          <li>El modelo se detecta automáticamente; no se puede elegir a mano.</li>
          <li>La herramienta no se conecta al scooter ni lo flashea: solo genera el archivo.</li>
          <li>
            El contenido del firmware nunca se guarda; solo se registran el modelo, los parches, los hashes y
            los tamaños.
          </li>
          {capabilities.status === "ready" ? (
            <li>
              Basado en bw-patcher v{capabilities.data.upstream.version} (
              <span className="font-mono text-xs">{capabilities.data.upstream.commit.slice(0, 7)}</span>).
            </li>
          ) : null}
        </ul>
      </section>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true" data-testid="firmware-live">
        {liveMessage}
      </div>
    </div>
  )
}
