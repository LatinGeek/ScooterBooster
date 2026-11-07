"use client"

import { Loader2, Lock, Wand2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { PatchCapability, PatchCode } from "./api-types"
import {
  PATCH_COPY,
  PATCH_GROUPS,
  evaluatePatchForm,
  isPatchLocked,
  type PatchFormState,
} from "./patch-form-state"

interface PatchFormProps {
  patches: PatchCapability[]
  state: PatchFormState
  applying: boolean
  onChange: (next: PatchFormState) => void
  onSubmit: () => void
  onCancel: () => void
}

const CHECKBOX = "h-5 w-5 shrink-0 cursor-pointer accent-[#10b981] disabled:cursor-not-allowed"

export function PatchForm({ patches, state, applying, onChange, onSubmit, onCancel }: PatchFormProps) {
  const evaluation = evaluatePatchForm(patches, state)
  const hasSelection = evaluation.selection.length > 0
  const hasErrors = Object.keys(evaluation.fieldErrors).length > 0
  const needsAck = evaluation.hasExperimental && !state.acknowledged
  const canSubmit = hasSelection && !hasErrors && !needsAck && !applying

  function setEnabled(code: PatchCode, enabled: boolean) {
    onChange({ ...state, enabled: { ...state.enabled, [code]: enabled } })
  }
  function setValue(code: PatchCode, value: string) {
    onChange({ ...state, values: { ...state.values, [code]: value } })
  }

  let blockedReason: string | null = null
  if (!hasSelection) blockedReason = "Seleccioná al menos un parche."
  else if (hasErrors) blockedReason = "Corregí los valores marcados antes de aplicar."
  else if (needsAck) blockedReason = "Confirmá la advertencia experimental para continuar."

  return (
    <Card data-testid="firmware-patch-form">
      <CardHeader>
        <h2 className="text-xl leading-tight font-semibold text-[#111827]">3. Parches</h2>
        <CardDescription>
          Solo se muestran los parches disponibles para el modelo detectado. El checksum se corrige
          automáticamente salvo en modo volcado completo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (canSubmit) onSubmit()
          }}
          noValidate
        >
          {PATCH_GROUPS.map((group) => {
            const groupPatches = patches.filter((patch) => PATCH_COPY[patch.code].group === group.id)
            if (groupPatches.length === 0) return null
            return (
              <fieldset key={group.id} className="min-w-0 space-y-3" disabled={applying}>
                <legend className="mb-1 text-sm font-semibold text-[#111827]">{group.title}</legend>
                {groupPatches.map((patch) => (
                  <PatchField
                    key={patch.code}
                    patch={patch}
                    state={state}
                    error={evaluation.fieldErrors[patch.code]}
                    onEnabled={(enabled) => setEnabled(patch.code, enabled)}
                    onValue={(value) => setValue(patch.code, value)}
                  />
                ))}
              </fieldset>
            )
          })}

          <fieldset className="min-w-0 space-y-3" disabled={applying}>
            <legend className="mb-1 text-sm font-semibold text-[#111827]">Modo de salida</legend>
            <label
              htmlFor="firmware-full-dump"
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-[#e5e7eb] p-3"
            >
              <input
                id="firmware-full-dump"
                type="checkbox"
                role="switch"
                className={CHECKBOX}
                checked={state.fullDump}
                aria-describedby="firmware-full-dump-desc"
                onChange={(event) => onChange({ ...state, fullDump: event.target.checked })}
              />
              <span className="space-y-0.5">
                <span className="block text-sm font-medium text-[#111827]">Volcado completo (full dump)</span>
                <span id="firmware-full-dump-desc" className="block text-xs text-[#6b7280]">
                  Disponible para técnicos y administradores. En este modo no se corrige el checksum
                  automáticamente; usalo solo si el archivo de origen es un volcado completo.
                </span>
              </span>
            </label>
            {state.fullDump ? (
              <p
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
                data-testid="firmware-full-dump-warning"
              >
                Volcado completo activo: el checksum no se recalcula, por lo que el resultado puede
                diferir de un parche normal. Los modelos Leqi igualmente generan la imagen completa.
              </p>
            ) : null}
          </fieldset>

          {evaluation.hasExperimental ? (
            <div
              className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4"
              data-testid="firmware-experimental-warning"
            >
              <p className="text-sm text-amber-900">
                <strong>Parches experimentales seleccionados</strong> (
                {evaluation.experimentalCodes.map((code) => PATCH_COPY[code].label).join(", ")}). No están
                validados en hardware: el scooter puede no arrancar bajo carga o quedar inutilizable.
              </p>
              <label
                htmlFor="firmware-ack"
                className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium text-amber-950"
              >
                <input
                  id="firmware-ack"
                  type="checkbox"
                  className={CHECKBOX}
                  checked={state.acknowledged}
                  disabled={applying}
                  onChange={(event) => onChange({ ...state, acknowledged: event.target.checked })}
                />
                <span>
                  Entiendo que los parches experimentales no están validados y que puedo dejar el scooter
                  inutilizable.
                </span>
              </label>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={!canSubmit}
              aria-describedby={blockedReason ? "firmware-submit-hint" : undefined}
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Wand2 className="h-4 w-4" aria-hidden="true" />
              )}
              {applying ? "Aplicando parches…" : "Aplicar parches"}
            </Button>
            {applying ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            ) : null}
            {blockedReason && !applying ? (
              <p id="firmware-submit-hint" className="text-sm text-[#6b7280]">
                {blockedReason}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

interface PatchFieldProps {
  patch: PatchCapability
  state: PatchFormState
  error: string | undefined
  onEnabled: (enabled: boolean) => void
  onValue: (value: string) => void
}

function PatchField({ patch, state, error, onEnabled, onValue }: PatchFieldProps) {
  const copy = PATCH_COPY[patch.code]
  const id = `firmware-patch-${patch.code}`
  const locked = isPatchLocked(patch.code, state)
  const enabled = state.enabled[patch.code] === true && !locked
  const experimental = patch.status === "experimental" || patch.code === "mss0exp"
  const rawValue = state.values[patch.code] ?? ""
  const min = patch.min ?? 0
  const max = patch.max ?? 100
  const step = patch.step ?? 1
  const numeric = Number(rawValue.replace(",", "."))
  const sliderValue = Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : min
  const describedBy = [`${id}-desc`, locked ? `${id}-locked` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      className={`rounded-xl border border-[#e5e7eb] p-3 ${locked ? "bg-[#f9fafb]" : "bg-white"}`}
      data-testid={`firmware-field-${patch.code}`}
    >
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className={CHECKBOX}
          checked={enabled}
          disabled={locked}
          aria-describedby={describedBy}
          onChange={(event) => onEnabled(event.target.checked)}
        />
        <span className="space-y-0.5">
          <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#111827]">
            {copy.label}
            {experimental ? <Badge variant="warning">Experimental</Badge> : null}
          </span>
          <span id={`${id}-desc`} className="block text-xs text-[#6b7280]">
            {copy.description}
          </span>
        </span>
      </label>

      {locked ? (
        <p
          id={`${id}-locked`}
          className="mt-2 flex items-start gap-2 text-xs text-[#6b7280]"
          data-testid="firmware-mss-locked"
        >
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Bloqueado: el arranque MSS0 experimental reemplaza este valor y el ajuste normal se ignora.
        </p>
      ) : null}

      {patch.kind === "number" ? (
        <div className="mt-2 grid items-center gap-3 sm:grid-cols-[1fr_10rem]">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={sliderValue}
            disabled={!enabled}
            aria-label={`${copy.label}: deslizador`}
            className="h-11 w-full min-w-0 cursor-pointer accent-[#10b981] disabled:cursor-not-allowed disabled:opacity-50"
            onChange={(event) => onValue(event.target.value)}
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="decimal"
              min={min}
              max={max}
              step={step}
              value={rawValue}
              disabled={!enabled}
              error={Boolean(error)}
              aria-label={`${copy.label}: valor${copy.unit ? ` en ${copy.unit}` : ""}`}
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(event) => onValue(event.target.value)}
            />
            {copy.unit ? <span className="text-xs text-[#6b7280]">{copy.unit}</span> : null}
          </div>
          <p className="text-xs text-[#6b7280] sm:col-span-2">
            Rango {min.toFixed(1)}–{max.toFixed(1)} {copy.unit ?? ""}, paso {step}
          </p>
        </div>
      ) : null}

      {patch.kind === "version" ? (
        <div className="mt-2 max-w-40">
          <Label htmlFor={`${id}-value`} className="sr-only">
            {copy.label}: 4 dígitos
          </Label>
          <Input
            id={`${id}-value`}
            inputMode="numeric"
            maxLength={4}
            value={rawValue}
            disabled={!enabled}
            error={Boolean(error)}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => onValue(event.target.value.replace(/\D/g, "").slice(0, 4))}
          />
        </div>
      ) : null}

      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}
