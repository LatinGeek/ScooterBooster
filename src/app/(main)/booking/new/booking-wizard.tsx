"use client"

import Image from "next/image"
import { useCallback, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Bike,
  Wrench,
  User,
  Calendar,
  ClipboardCheck,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DisclaimerModal } from "@/components/disclaimer-modal"
import { requiresBookingDisclaimer } from "@/lib/booking-rules"
import type { ScooterModel, Service, Technician } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardState {
  scooterModelId: string
  serviceId: string
  technicianId: string
  scheduledDate: string
  notes: string
  disclaimerAccepted: boolean
  disclaimerAcceptedAt: string | null
}

type Step = 1 | 2 | 3 | 4 | 5

interface Props {
  models: ScooterModel[]
  services: Service[]
  technicians: Technician[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SERVICE_FEE_PCT = 10

function calcPricing(basePrice: number) {
  const fee = Math.round(basePrice * (SERVICE_FEE_PCT / 100))
  return { basePrice, fee, total: basePrice + fee }
}

function formatUYU(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(amount)
}

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
}

const STEPS: { label: string; icon: React.FC<{ className?: string }> }[] = [
  { label: "Scooter", icon: Bike },
  { label: "Servicio", icon: Wrench },
  { label: "Técnico", icon: User },
  { label: "Horario", icon: Calendar },
  { label: "Confirmar", icon: ClipboardCheck },
]

// ─── Stepper ─────────────────────────────────────────────────────────────────

function Stepper({ currentStep }: { currentStep: Step }) {
  return (
    <nav aria-label="Pasos de la reserva" className="mb-8">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const stepNum = (idx + 1) as Step
          const done = stepNum < currentStep
          const active = stepNum === currentStep
          const Icon = step.icon
          return (
            <li key={step.label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {idx > 0 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors duration-300 ${done ? "bg-[#10b981]" : "bg-[#e5e7eb]"}`}
                  />
                )}
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    done
                      ? "border-[#10b981] bg-[#10b981] text-white"
                      : active
                        ? "border-[#10b981] bg-white text-[#10b981]"
                        : "border-[#e5e7eb] bg-white text-[#9ca3af]"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 transition-colors duration-300 ${done ? "bg-[#10b981]" : "bg-[#e5e7eb]"}`}
                  />
                )}
              </div>
              <span
                className={`mt-1 text-xs font-medium ${active ? "text-[#10b981]" : done ? "text-[#10b981]" : "text-[#9ca3af]"}`}
              >
                {step.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// ─── Step 1: Scooter Model ────────────────────────────────────────────────────

function StepScooter({
  models,
  selected,
  onSelect,
}: {
  models: ScooterModel[]
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">¿Cuál es tu scooter?</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {models.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-150 hover:border-[#10b981] ${
              selected === m.id ? "border-[#10b981] bg-[#d1fae5]" : "border-[#e5e7eb] bg-white"
            }`}
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f3f4f6]">
              {m.imageURL ? (
                <Image
                  src={m.imageURL}
                  alt={`Foto del ${m.name}`}
                  width={112}
                  height={112}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Bike className="h-5 w-5 text-[#10b981]" />
              )}
            </div>
            <div>
              <p className="font-semibold text-[#111827]">{m.name}</p>
              <p className="text-xs text-[#6b7280]">
                {m.specs.maxSpeed} km/h · {m.specs.range} km
              </p>
            </div>
            {selected === m.id && <Check className="ml-auto h-5 w-5 shrink-0 text-[#10b981]" />}
          </button>
        ))}
      </div>
      {models.length === 0 && (
        <p className="rounded-xl border border-[#e5e7eb] p-6 text-center text-[#6b7280]">
          No hay modelos disponibles por el momento.
        </p>
      )}
    </div>
  )
}

// ─── Step 2: Service ─────────────────────────────────────────────────────────

function StepService({
  services,
  model,
  selected,
  onSelect,
}: {
  services: Service[]
  model: ScooterModel | undefined
  selected: string
  onSelect: (id: string) => void
}) {
  const compatible = model
    ? services.filter((s) => model.compatibleServices.includes(s.id))
    : services

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">¿Qué servicio necesitás?</h2>
      {model && (
        <p className="mb-4 text-sm text-[#6b7280]">
          Servicios disponibles para <strong>{model.name}</strong>
        </p>
      )}
      <div className="space-y-3">
        {compatible.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex w-full cursor-pointer items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 hover:border-[#10b981] ${
              selected === s.id ? "border-[#10b981] bg-[#d1fae5]" : "border-[#e5e7eb] bg-white"
            }`}
          >
            <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-[#10b981]" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[#111827]">{s.name}</p>
                {s.requiresDisclaimer && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                    Aviso legal
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-[#6b7280]">{s.description}</p>
              <p className="mt-1 text-xs text-[#9ca3af]">
                Duración estimada: {s.estimatedDuration} min
              </p>
            </div>
            {selected === s.id && <Check className="h-5 w-5 shrink-0 text-[#10b981]" />}
          </button>
        ))}
      </div>
      {compatible.length === 0 && (
        <p className="rounded-xl border border-[#e5e7eb] p-6 text-center text-[#6b7280]">
          No hay servicios disponibles para este modelo.
        </p>
      )}
    </div>
  )
}

// ─── Step 3: Technician ───────────────────────────────────────────────────────

function StepTechnician({
  technicians,
  service,
  scooterModel,
  selected,
  onSelect,
}: {
  technicians: Technician[]
  service: Service | undefined
  scooterModel: ScooterModel | undefined
  selected: string
  onSelect: (id: string) => void
}) {
  // Filter: technician must offer the selected service AND support the scooter brand
  const available = technicians.filter((t) => {
    if (service && !t.services.includes(service.id)) return false
    if (scooterModel && !t.supportedBrands.includes(scooterModel.brandId)) return false
    return true
  })

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">Elegí tu técnico</h2>
      <div className="space-y-3">
        {available.map((t) => {
          const pricing = service ? t.pricing[service.id] : undefined
          const { basePrice, fee, total } = pricing
            ? calcPricing(pricing.basePrice)
            : { basePrice: 0, fee: 0, total: 0 }

          return (
            <button
              key={t.id}
              onClick={() => onSelect(t.id)}
              className={`flex w-full cursor-pointer items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 hover:border-[#10b981] ${
                selected === t.id ? "border-[#10b981] bg-[#d1fae5]" : "border-[#e5e7eb] bg-white"
              }`}
            >
              {/* Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-lg font-bold text-white">
                {t.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[#111827]">{t.displayName}</p>
                  <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
                    ★ {t.rating.toFixed(1)}
                    <span className="font-normal text-[#9ca3af]">({t.reviewCount})</span>
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-[#6b7280]">{t.location}</p>
                {pricing && (
                  <p className="mt-1 text-sm font-semibold text-[#10b981]">
                    {formatUYU(total)}{" "}
                    <span className="text-xs font-normal text-[#9ca3af]">
                      (base {formatUYU(basePrice)} + {SERVICE_FEE_PCT}% servicio {formatUYU(fee)})
                    </span>
                  </p>
                )}
              </div>
              {selected === t.id && <Check className="h-5 w-5 shrink-0 text-[#10b981]" />}
            </button>
          )
        })}
      </div>
      {available.length === 0 && (
        <p className="rounded-xl border border-[#e5e7eb] p-6 text-center text-[#6b7280]">
          No hay técnicos disponibles para esta combinación de servicio y scooter.
        </p>
      )}
    </div>
  )
}

// ─── Step 4: Date & Time ──────────────────────────────────────────────────────

function StepDateTime({
  technician,
  scheduledDate,
  notes,
  onDateChange,
  onNotesChange,
}: {
  technician: Technician | undefined
  scheduledDate: string
  notes: string
  onDateChange: (v: string) => void
  onNotesChange: (v: string) => void
}) {
  // Build the min date (today + 1 day, ISO)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().slice(0, 16)

  // The max date (3 months out)
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 3)
  const maxDateStr = maxDate.toISOString().slice(0, 16)

  // Show availability hours for reference
  const availabilityEntries = technician
    ? Object.entries(technician.availability).filter(([, day]) => day.isAvailable)
    : []

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">Elegí fecha y hora</h2>

      {technician && availabilityEntries.length > 0 && (
        <div className="mb-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <p className="mb-2 text-sm font-semibold text-[#374151]">Disponibilidad del técnico</p>
          <ul className="space-y-1">
            {availabilityEntries.map(([day, avail]) => (
              <li key={day} className="flex items-center gap-2 text-sm text-[#6b7280]">
                <span className="w-24 font-medium text-[#374151]">{DAY_LABELS[day] ?? day}</span>
                <span>
                  {avail.start} – {avail.end}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="scheduled-date" className="block text-sm font-medium text-[#374151]">
            Fecha y hora de la cita *
          </label>
          <input
            id="scheduled-date"
            type="datetime-local"
            min={minDate}
            max={maxDateStr}
            value={scheduledDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm text-[#111827] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-[#374151]">
            Notas adicionales (opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Ej: El scooter está dando error en el display, la batería carga lento..."
            className="mt-1 block w-full resize-none rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981] focus:outline-none"
          />
          <p className="mt-1 text-right text-xs text-[#9ca3af]">{notes.length}/500</p>
        </div>
      </div>
    </div>
  )
}

// ─── Step 5: Confirm ──────────────────────────────────────────────────────────

function StepConfirm({
  wizardState,
  model,
  service,
  technician,
}: {
  wizardState: WizardState
  model: ScooterModel | undefined
  service: Service | undefined
  technician: Technician | undefined
}) {
  const pricing = technician && service ? technician.pricing[service.id] : undefined
  const { basePrice, fee, total } = pricing
    ? calcPricing(pricing.basePrice)
    : { basePrice: 0, fee: 0, total: 0 }

  const scheduled = wizardState.scheduledDate
    ? new Intl.DateTimeFormat("es-UY", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(wizardState.scheduledDate))
    : "—"

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">Revisá tu reserva</h2>
      <div className="divide-y divide-[#e5e7eb] rounded-xl border border-[#e5e7eb] bg-white">
        <Row label="Scooter" value={model?.name ?? "—"} />
        <Row label="Servicio" value={service?.name ?? "—"} />
        <Row label="Técnico" value={technician?.displayName ?? "—"} />
        <Row label="Fecha y hora" value={scheduled} />
        {wizardState.notes && <Row label="Notas" value={wizardState.notes} />}
        <div className="px-4 py-3">
          <div className="flex justify-between text-sm text-[#6b7280]">
            <span>Precio base</span>
            <span>{formatUYU(basePrice)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#6b7280]">
            <span>Fee de servicio ({SERVICE_FEE_PCT}%)</span>
            <span>{formatUYU(fee)}</span>
          </div>
          <div className="mt-2 flex justify-between font-bold text-[#111827]">
            <span>Total</span>
            <span className="text-[#10b981]">{formatUYU(total)}</span>
          </div>
        </div>
      </div>
      {requiresBookingDisclaimer(service) && wizardState.disclaimerAccepted && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#d1fae5] bg-[#d1fae5] px-4 py-3 text-sm text-[#065f46]">
          <Check className="h-4 w-4 shrink-0" />
          <span>Aviso legal aceptado</span>
        </div>
      )}
      <p className="mt-4 text-sm text-[#6b7280]">
        Al confirmar, se creará la reserva con estado <strong>pendiente de pago</strong>. Recibirás
        el link de pago a continuación.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-[#6b7280]">{label}</span>
      <span className="text-right font-medium text-[#111827]">{value}</span>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function BookingWizard({ models, services, technicians }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<Step>(() => {
    const s = parseInt(searchParams.get("step") ?? "1")
    return (s >= 1 && s <= 5 ? s : 1) as Step
  })

  const [state, setState] = useState<WizardState>({
    scooterModelId: searchParams.get("model") ?? "",
    serviceId: searchParams.get("service") ?? "",
    technicianId: searchParams.get("technician") ?? "",
    scheduledDate: searchParams.get("date") ?? "",
    notes: searchParams.get("notes") ?? "",
    disclaimerAccepted: false,
    disclaimerAcceptedAt: null,
  })

  const [showDisclaimer, setShowDisclaimer] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const model = models.find((m) => m.id === state.scooterModelId)
  const service = services.find((s) => s.id === state.serviceId)
  const technician = technicians.find((t) => t.id === state.technicianId)

  // Sync URL params
  const syncUrl = useCallback(
    (newState: Partial<WizardState>, newStep: Step) => {
      const params = new URLSearchParams()
      params.set("step", String(newStep))
      if (newState.scooterModelId ?? state.scooterModelId)
        params.set("model", newState.scooterModelId ?? state.scooterModelId)
      if (newState.serviceId ?? state.serviceId)
        params.set("service", newState.serviceId ?? state.serviceId)
      if (newState.technicianId ?? state.technicianId)
        params.set("technician", newState.technicianId ?? state.technicianId)
      if (newState.scheduledDate ?? state.scheduledDate)
        params.set("date", newState.scheduledDate ?? state.scheduledDate)
      router.replace(`/booking/new?${params.toString()}`, { scroll: false })
    },
    [state, router]
  )

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return !!state.scooterModelId
      case 2:
        return !!state.serviceId
      case 3:
        return !!state.technicianId
      case 4:
        return !!state.scheduledDate
      case 5:
        return true
    }
  }

  function handleNext() {
    if (!canAdvance()) return
    // If step 5, confirm-action is submit
    if (step === 5) {
      handleSubmit()
      return
    }

    const nextStep = (step + 1) as Step
    // If service requires disclaimer and we're moving to step 5, show it first
    if (nextStep === 5 && requiresBookingDisclaimer(service) && !state.disclaimerAccepted) {
      setShowDisclaimer(true)
      return
    }
    setStep(nextStep)
    syncUrl({}, nextStep)
  }

  function handleBack() {
    if (step === 1) return
    const prevStep = (step - 1) as Step
    setStep(prevStep)
    syncUrl({}, prevStep)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId: state.technicianId,
          serviceId: state.serviceId,
          scooterModelId: state.scooterModelId,
          scheduledDate: new Date(state.scheduledDate).toISOString(),
          notes: state.notes || null,
          disclaimerAccepted: state.disclaimerAccepted,
        }),
      })

      const json = (await res.json()) as {
        success: boolean
        data?: { booking: { id: string }; paymentLinkUrl?: string | null }
        error?: string
      }

      if (!res.ok || !json.success) {
        setError(json.error ?? "Error al crear la reserva. Intentá de nuevo.")
        return
      }

      const bookingId = json.data?.booking?.id
      const paymentLinkUrl = json.data?.paymentLinkUrl

      if (!bookingId) {
        setError("Error inesperado al crear la reserva.")
        return
      }

      // If MP payment link is available, redirect to MercadoPago checkout
      if (paymentLinkUrl) {
        window.location.href = paymentLinkUrl
      } else {
        // No MP credentials configured (dev mode) — go to booking detail
        router.push(`/booking/${bookingId}`)
      }
    } catch {
      setError("Error de conexión. Revisá tu internet e intentá de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleDisclaimerAccept() {
    const now = new Date().toISOString()
    update({ disclaimerAccepted: true, disclaimerAcceptedAt: now })
    setShowDisclaimer(false)
    const nextStep = 5 as Step
    setStep(nextStep)
    syncUrl({ disclaimerAccepted: true }, nextStep)
  }

  function handleDisclaimerDecline() {
    setShowDisclaimer(false)
  }

  // Step-level field updates
  function handleSelectModel(id: string) {
    // Reset downstream when model changes
    update({ scooterModelId: id, serviceId: "", technicianId: "", scheduledDate: "" })
  }

  function handleSelectService(id: string) {
    update({ serviceId: id, technicianId: "", disclaimerAccepted: false })
  }

  function handleSelectTechnician(id: string) {
    update({ technicianId: id })
  }

  return (
    <>
      <DisclaimerModal
        open={showDisclaimer}
        onAccept={handleDisclaimerAccept}
        onDecline={handleDisclaimerDecline}
      />

      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <Stepper currentStep={step} />

        {/* Step content */}
        <div className="min-h-[300px]">
          {step === 1 && (
            <StepScooter
              models={models}
              selected={state.scooterModelId}
              onSelect={handleSelectModel}
            />
          )}
          {step === 2 && (
            <StepService
              services={services}
              model={model}
              selected={state.serviceId}
              onSelect={handleSelectService}
            />
          )}
          {step === 3 && (
            <StepTechnician
              technicians={technicians}
              service={service}
              scooterModel={model}
              selected={state.technicianId}
              onSelect={handleSelectTechnician}
            />
          )}
          {step === 4 && (
            <StepDateTime
              technician={technician}
              scheduledDate={state.scheduledDate}
              notes={state.notes}
              onDateChange={(v) => update({ scheduledDate: v })}
              onNotesChange={(v) => update({ notes: v })}
            />
          )}
          {step === 5 && (
            <StepConfirm
              wizardState={state}
              model={model}
              service={service}
              technician={technician}
            />
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Pricing bar (visible from step 3+) */}
        {step >= 3 &&
          technician &&
          service &&
          (() => {
            const pricing = technician.pricing[service.id]
            if (!pricing) return null
            const { total } = calcPricing(pricing.basePrice)
            return (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[#d1fae5] px-4 py-3">
                <span className="text-sm text-[#065f46]">Total estimado</span>
                <span className="text-lg font-bold text-[#10b981]">{formatUYU(total)}</span>
              </div>
            )
          })()}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 1 || submitting}>
            <ChevronLeft className="h-4 w-4" />
            Atrás
          </Button>

          <Button onClick={handleNext} disabled={!canAdvance() || submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando reserva...
              </>
            ) : step === 5 ? (
              <>
                Confirmar reserva
                <Check className="h-4 w-4" />
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
