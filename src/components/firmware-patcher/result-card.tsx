"use client"

import { forwardRef } from "react"
import { CircleCheck, Download, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { PatchLogEntry, PatchResult } from "./api-types"
import { formatBytes } from "./upload-dropzone"

interface ResultCardProps {
  result: PatchResult
  modelLabel: string
  fullDump: boolean
  experimental: boolean
  onDownload: () => void
  onReset: () => void
}

function formatOffset(offset: PatchLogEntry["offset"]): string {
  if (typeof offset === "number") return `0x${offset.toString(16).toUpperCase().padStart(6, "0")}`
  return String(offset)
}

function formatBytesValue(value: PatchLogEntry["before"]): string {
  if (value === null || value === undefined) return "—"
  if (Array.isArray(value)) return value.map((byte) => byte.toString(16).padStart(2, "0")).join(" ")
  return String(value)
}

export const ResultCard = forwardRef<HTMLHeadingElement, ResultCardProps>(function ResultCard(
  { result, modelLabel, fullDump, experimental, onDownload, onReset },
  headingRef
) {
  return (
    <Card data-testid="firmware-result-card">
      <CardHeader>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="flex items-center gap-2 text-xl leading-tight font-semibold text-[#111827] focus:outline-none"
        >
          <CircleCheck className="h-6 w-6 text-[#059669]" aria-hidden="true" />
          4. Firmware parcheado
        </h2>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {fullDump ? <Badge variant="secondary">Volcado completo</Badge> : <Badge>Checksum corregido</Badge>}
          {experimental ? <Badge variant="warning">Incluye parches experimentales</Badge> : null}
          <Badge variant="outline">Sin firma oficial</Badge>
        </div>

        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <Fact label="Modelo" value={modelLabel} />
          <Fact label="Archivo de salida" value={result.filename} />
          <Fact label="Tamaño de entrada" value={result.inputSize === null ? "—" : formatBytes(result.inputSize)} />
          <Fact label="Tamaño de salida" value={result.outputSize === null ? "—" : formatBytes(result.outputSize)} />
          <Fact label="SHA-256 de entrada" value={result.inputSha256 ?? "—"} mono />
          <Fact label="SHA-256 de salida" value={result.outputSha256 ?? "—"} mono />
        </dl>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#111827]">Registro de parches</h3>
          {result.log.length > 0 ? (
            <div
              role="region"
              aria-label="Registro de parches aplicados"
              tabIndex={0}
              className="max-w-full overflow-x-auto rounded-lg border border-[#e5e7eb] focus-visible:ring-2 focus-visible:ring-[#10b981] focus-visible:outline-none"
            >
              <table className="w-full min-w-[32rem] text-left text-xs">
                <caption className="sr-only">Parches aplicados con offset y bytes antes y después</caption>
                <thead className="bg-[#f9fafb] text-[#6b7280]">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-medium">Parche</th>
                    <th scope="col" className="px-3 py-2 font-medium">Offset</th>
                    <th scope="col" className="px-3 py-2 font-medium">Antes</th>
                    <th scope="col" className="px-3 py-2 font-medium">Después</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f3f4f6]">
                  {result.log.map((entry, index) => (
                    <tr key={`${entry.name}-${index}`}>
                      <th scope="row" className="px-3 py-2 font-medium text-[#111827]">{entry.name}</th>
                      <td className="px-3 py-2 font-mono">{formatOffset(entry.offset)}</td>
                      <td className="px-3 py-2 font-mono break-all">{formatBytesValue(entry.before)}</td>
                      <td className="px-3 py-2 font-mono break-all">{formatBytesValue(entry.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-[#6b7280]" data-testid="firmware-log-unavailable">
              {result.logTruncated
                ? "El registro detallado es demasiado extenso y se omitió. El archivo generado es válido."
                : "El servidor no devolvió el registro de parches."}
            </p>
          )}
          {result.log.length > 0 && result.logTruncated ? (
            <p className="mt-2 text-xs text-[#6b7280]">El registro se muestra incompleto.</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={onDownload}
            className="h-auto min-h-11 max-w-full text-left break-all whitespace-normal"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Descargar {result.filename}
          </Button>
          <Button type="button" variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Parchear otro archivo
          </Button>
        </div>
      </CardContent>
    </Card>
  )
})

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-[#6b7280]">{label}</dt>
      <dd className={`mt-0.5 font-medium break-all text-[#111827] ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  )
}
