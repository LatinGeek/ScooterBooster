"use client"

import Image from "next/image"
import { useCallback, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Bike,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  User,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DisclaimerModal } from "@/components/disclaimer-modal"
import { ScooterCard } from "@/components/scooter-card"
import { TechnicianCard } from "@/components/technician-card"
import { trackAnalyticsEvent } from "@/lib/analytics"
import { requiresBookingDisclaimer } from "@/lib/booking-rules"
import { calculatePricing, DEFAULT_SERVICE_FEE_AMOUNT } from "@/lib/pricing"
import { slugify } from "@/lib/slugs"
import type { ScooterBrand, ScooterModel, Service, Technician } from "@/types"

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
  brands: ScooterBrand[]
  models: ScooterModel[]
  services: Service[]
  technicians: Technician[]
}

const BRAND_LOGO_BACKGROUNDS: Record<string, string> = {
  atom: "#3b9bef",
  joyor: "#ffffff",
  "mi-style": "#020203",
  mistyle: "#020203",
  navee: "#000000",
  xiaomi: "#ff6700",
}

function formatUYU(amount: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getBrandLogoBackground(brand: ScooterBrand) {
  return (
    BRAND_LOGO_BACKGROUNDS[slugify(brand.slug)] ??
    BRAND_LOGO_BACKGROUNDS[slugify(brand.name)] ??
    "#f3f4f6"
  )
}

const DAY_LABELS: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sabado",
  sunday: "Domingo",
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const

function getDayKey(dateValue: string): string | null {
  if (!dateValue) return null
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return DAY_KEYS[date.getDay()] ?? null
}

function buildHourSlots(start: string, end: string) {
  const [startHour = "0", startMinute = "0"] = start.split(":")
  const [endHour = "0", endMinute = "0"] = end.split(":")
  const startMinutes = parseInt(startHour, 10) * 60 + parseInt(startMinute, 10)
  const endMinutes = parseInt(endHour, 10) * 60 + parseInt(endMinute, 10)

  return Array.from({ length: 24 }, (_, hour) => hour)
    .map((hour) => hour * 60)
    .filter((slotStart) => slotStart >= startMinutes && slotStart < endMinutes)
    .map((slotStart) => {
      const hour = String(Math.floor(slotStart / 60)).padStart(2, "0")
      return `${hour}:00`
    })
}

const STEPS: { label: string; icon: React.FC<{ className?: string }> }[] = [
  { label: "Scooter", icon: Bike },
  { label: "Servicio", icon: Wrench },
  { label: "Tecnico", icon: User },
  { label: "Horario", icon: Calendar },
  { label: "Confirmar", icon: ClipboardCheck },
]

function Stepper({ currentStep }: { currentStep: Step }) {
  const currentIndex = currentStep - 1
  const currentLabel = STEPS[currentIndex]?.label ?? ""

  return (
    <nav
      aria-label="Pasos de la reserva"
      className="mb-8 rounded-2xl border border-[#e5e7eb] bg-[linear-gradient(135deg,#f8fffb_0%,#ffffff_45%,#f3f4f6_100%)] p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-4 sm:hidden">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
            Paso {currentStep} de {STEPS.length}
          </p>
          <p className="mt-1 text-base font-semibold text-[#111827]">{currentLabel}</p>
        </div>
        <div className="rounded-full bg-[#d1fae5] px-3 py-1 text-xs font-semibold text-[#059669]">
          {Math.round((currentStep / STEPS.length) * 100)}%
        </div>
      </div>

      <div className="mb-4 sm:hidden">
        <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#10b981_0%,#34d399_100%)] transition-all duration-300"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="relative hidden sm:block">
        <div className="absolute left-[calc(10%+20px)] right-[calc(10%-20px)] top-5 h-[2px] rounded-full bg-[#e5e7eb]" />
        <div
          className="absolute left-[calc(10%+20px)] top-5 h-[2px] rounded-full bg-[linear-gradient(90deg,#10b981_0%,#34d399_100%)] transition-all duration-300"
          style={{
            width:
              currentStep === 1
                ? "0%"
                : `calc(${((currentStep - 1) / (STEPS.length - 1)) * 80}% - ${((currentStep - 1) / (STEPS.length - 1)) * 40}px)`,
          }}
        />
      </div>

      <ol className="grid grid-cols-5 gap-2 sm:flex sm:items-start sm:justify-between sm:gap-0">
        {STEPS.map((step, idx) => {
          const stepNum = (idx + 1) as Step
          const done = stepNum < currentStep
          const active = stepNum === currentStep
          const Icon = step.icon

          return (
            <li
              key={step.label}
              className="relative flex min-w-0 flex-col items-center sm:flex-1"
            >
              <div
                className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm transition-all duration-300 sm:h-10 sm:w-10 sm:rounded-full ${
                  done
                    ? "border-[#10b981] bg-[#10b981] text-white shadow-[0_10px_24px_rgba(16,185,129,0.24)]"
                    : active
                      ? "border-[#10b981] bg-white text-[#10b981] shadow-[0_12px_28px_rgba(16,185,129,0.16)] ring-4 ring-[#d1fae5]"
                      : "border-[#e5e7eb] bg-white text-[#9ca3af]"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>

              <div className="mt-2 text-center">
                <p
                  className={`text-[11px] font-semibold sm:text-xs ${
                    active || done ? "text-[#111827]" : "text-[#9ca3af]"
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 hidden text-[11px] sm:block">
                  <span className={active ? "text-[#10b981]" : "text-[#cbd5e1]"}>0{stepNum}</span>
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function StepScooter({
  brands,
  models,
  selected,
  onSelect,
}: {
  brands: ScooterBrand[]
  models: ScooterModel[]
  selected: string
  onSelect: (id: string) => void
}) {
  const selectedModel = models.find((model) => model.id === selected)
  const [selectedBrandId, setSelectedBrandId] = useState(selectedModel?.brandId ?? "")

  const modelsByBrand = models.reduce<Record<string, ScooterModel[]>>((acc, model) => {
    const current = acc[model.brandId] ?? []
    acc[model.brandId] = [...current, model]
    return acc
  }, {})

  const brandsWithModels = brands.filter((brand) => (modelsByBrand[brand.id]?.length ?? 0) > 0)
  const visibleModels = selectedBrandId ? modelsByBrand[selectedBrandId] ?? [] : []
  const selectedBrand = brandsWithModels.find((brand) => brand.id === selectedBrandId)

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-[#111827]">Cual es tu scooter?</h2>
      <p className="mb-4 text-sm text-[#6b7280]">
        Primero elegi la marca y despues selecciona tu modelo.
      </p>

      <div className="overflow-hidden">
        <div
          className="flex w-[200%] transition-transform duration-300 ease-out"
          style={{ transform: selectedBrandId ? "translateX(-50%)" : "translateX(0%)" }}
        >
          <div className="w-1/2 pr-2">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {brandsWithModels.map((brand) => {
                const brandModels = modelsByBrand[brand.id] ?? []

                return (
                  <button
                    key={brand.id}
                    onClick={() => setSelectedBrandId(brand.id)}
                    className="group flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-[#e5e7eb] bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#10b981] hover:shadow-sm"
                  >
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                      style={{ backgroundColor: getBrandLogoBackground(brand) }}
                    >
                      {brand.logoURL ? (
                        <Image
                          src={brand.logoURL}
                          alt={`Logo de ${brand.name}`}
                          width={112}
                          height={112}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <span className="text-lg font-bold text-[#10b981]">
                          {brand.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#111827]">{brand.name}</p>
                      <p className="text-xs text-[#6b7280]">
                        {brandModels.length} modelo{brandModels.length !== 1 ? "s" : ""} disponible
                        {brandModels.length !== 1 ? "s" : ""}
                      </p>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-[#9ca3af] transition-colors group-hover:text-[#10b981]" />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="w-1/2 pl-2">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9ca3af]">
                  Marca
                </p>
                <p className="text-lg font-semibold text-[#111827]">
                  {selectedBrand?.name ?? "Selecciona una marca"}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedBrandId("")}
              >
                <ChevronLeft className="h-4 w-4" />
                Volver
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visibleModels.map((model) => (
                <ScooterCard
                  key={model.id}
                  model={model}
                  brandName={selectedBrand?.name ?? ""}
                  variant="compact"
                  selected={selected === model.id}
                  onSelect={() => onSelect(model.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {brandsWithModels.length === 0 && (
        <p className="rounded-xl border border-[#e5e7eb] p-6 text-center text-[#6b7280]">
          No hay modelos disponibles por el momento.
        </p>
      )}
    </div>
  )
}

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
    ? services.filter((service) => model.compatibleServices.includes(service.id))
    : services

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">Que servicio necesitas?</h2>
      {model && (
        <p className="mb-4 text-sm text-[#6b7280]">
          Servicios disponibles para <strong>{model.name}</strong>
        </p>
      )}
      <div className="space-y-3">
        {compatible.map((service) => (
          <button
            key={service.id}
            onClick={() => onSelect(service.id)}
            className={`flex w-full cursor-pointer items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 hover:border-[#10b981] ${
              selected === service.id
                ? "border-[#10b981] bg-[#d1fae5]"
                : "border-[#e5e7eb] bg-white"
            }`}
          >
            <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-[#10b981]" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-[#111827]">{service.name}</p>
                {service.requiresDisclaimer && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                    Aviso legal
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-[#6b7280]">{service.description}</p>
              <p className="mt-1 text-xs text-[#9ca3af]">
                Duracion estimada: {service.estimatedDuration} min
              </p>
            </div>
            {selected === service.id && <Check className="h-5 w-5 shrink-0 text-[#10b981]" />}
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
  const available = technicians.filter((technician) => {
    if (service && !technician.services.includes(service.id)) return false
    if (scooterModel && !technician.supportedBrands.includes(scooterModel.brandId)) return false
    return true
  })

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">Elegi tu tecnico</h2>
      <div className="space-y-3">
        {available.map((technician) => (
          <TechnicianCard
            key={technician.id}
            technician={technician}
            variant="compact"
            serviceId={service?.id}
            selected={selected === technician.id}
            onSelect={() => onSelect(technician.id)}
          />
        ))}
      </div>
      {available.length === 0 && (
        <p className="rounded-xl border border-[#e5e7eb] p-6 text-center text-[#6b7280]">
          No hay tecnicos disponibles para esta combinacion de servicio y scooter.
        </p>
      )}
    </div>
  )
}

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
  const selectedDate = scheduledDate.slice(0, 10)
  const selectedTime = scheduledDate.slice(11, 16)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().slice(0, 10)

  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 3)
  const maxDateStr = maxDate.toISOString().slice(0, 10)

  const availabilityEntries = technician
    ? Object.entries(technician.availability).filter(([, day]) => day.isAvailable)
    : []
  const selectedDayKey = getDayKey(selectedDate)
  const selectedDayAvailability =
    technician && selectedDayKey ? technician.availability[selectedDayKey] : undefined
  const selectedDaySlots = useMemo(() => {
    if (!selectedDayAvailability?.isAvailable) return []
    return buildHourSlots(selectedDayAvailability.start, selectedDayAvailability.end)
  }, [selectedDayAvailability])

  function handleDateSelection(dateValue: string) {
    if (!dateValue) {
      onDateChange("")
      return
    }

    const dayKey = getDayKey(dateValue)
    const availability = dayKey && technician ? technician.availability[dayKey] : undefined
    const slots =
      availability?.isAvailable ? buildHourSlots(availability.start, availability.end) : []
    const nextTime = slots.includes(selectedTime) ? selectedTime : ""
    onDateChange(nextTime ? `${dateValue}T${nextTime}` : `${dateValue}T`)
  }

  function handleTimeSelection(timeValue: string) {
    if (!selectedDate) {
      onDateChange("")
      return
    }
    onDateChange(`${selectedDate}T${timeValue}`)
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">Elegi fecha y hora</h2>

      {technician && availabilityEntries.length > 0 && (
        <div className="mb-4 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-4">
          <p className="mb-2 text-sm font-semibold text-[#374151]">
            Disponibilidad del tecnico
          </p>
          <ul className="space-y-1">
            {availabilityEntries.map(([day, avail]) => (
              <li key={day} className="flex items-center gap-2 text-sm text-[#6b7280]">
                <span className="w-24 font-medium text-[#374151]">
                  {DAY_LABELS[day] ?? day}
                </span>
                <span>
                  {avail.start} - {avail.end}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="scheduled-date" className="block text-sm font-medium text-[#374151]">
            Fecha de la cita *
          </label>
          <input
            id="scheduled-date"
            type="date"
            min={minDate}
            max={maxDateStr}
            value={selectedDate}
            onChange={(e) => handleDateSelection(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm text-[#111827] focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
          />
        </div>

        <div>
          <label htmlFor="scheduled-time" className="block text-sm font-medium text-[#374151]">
            Hora de la cita *
          </label>
          <select
            id="scheduled-time"
            value={selectedDaySlots.includes(selectedTime) ? selectedTime : ""}
            onChange={(e) => handleTimeSelection(e.target.value)}
            disabled={!selectedDate || selectedDaySlots.length === 0}
            className="mt-1 block w-full rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm text-[#111827] disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#9ca3af] focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
          >
            <option value="">
              {!selectedDate
                ? "Elegi primero una fecha"
                : selectedDaySlots.length === 0
                  ? "No hay horas disponibles ese dia"
                  : "Selecciona una hora"}
            </option>
            {selectedDaySlots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
          {selectedDate && selectedDayAvailability?.isAvailable ? (
            <p className="mt-1 text-xs text-[#6b7280]">
              Horarios disponibles para {DAY_LABELS[selectedDayKey ?? ""] ?? "ese dia"}:{" "}
              {selectedDayAvailability.start} - {selectedDayAvailability.end}
            </p>
          ) : null}
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
            placeholder="Ej: el scooter da error en el display o la bateria carga lento..."
            className="mt-1 block w-full resize-none rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
          />
          <p className="mt-1 text-right text-xs text-[#9ca3af]">{notes.length}/500</p>
        </div>
      </div>
    </div>
  )
}

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
  const { basePrice, serviceFee, totalPrice } = pricing
    ? calculatePricing(pricing.basePrice)
    : { basePrice: 0, serviceFee: 0, totalPrice: 0 }

  const scheduled = wizardState.scheduledDate
    ? new Intl.DateTimeFormat("es-UY", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(wizardState.scheduledDate))
    : "-"

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">Revisa tu reserva</h2>
      <div className="divide-y divide-[#e5e7eb] rounded-xl border border-[#e5e7eb] bg-white">
        <Row label="Scooter" value={model?.name ?? "-"} />
        <Row label="Servicio" value={service?.name ?? "-"} />
        <Row label="Tecnico" value={technician?.displayName ?? "-"} />
        <Row label="Fecha y hora" value={scheduled} />
        {wizardState.notes && <Row label="Notas" value={wizardState.notes} />}
        <div className="px-4 py-3">
          <div className="flex justify-between text-sm text-[#6b7280]">
            <span>Pago al tecnico</span>
            <span>{formatUYU(basePrice)}</span>
          </div>
          <div className="flex justify-between text-sm text-[#6b7280]">
            <span>Reserva online</span>
            <span>{formatUYU(serviceFee)}</span>
          </div>
          <div className="mt-2 flex justify-between font-bold text-[#111827]">
            <span>Total de referencia</span>
            <span className="text-[#10b981]">{formatUYU(totalPrice)}</span>
          </div>
          <p className="mt-3 text-xs text-[#6b7280]">
            Pagas {formatUYU(serviceFee)} ahora para confirmar la reserva. Los{" "}
            {formatUYU(basePrice)} del servicio se coordinan directamente con el tecnico.
          </p>
        </div>
      </div>
      {requiresBookingDisclaimer(service) && wizardState.disclaimerAccepted && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#d1fae5] bg-[#d1fae5] px-4 py-3 text-sm text-[#065f46]">
          <Check className="h-4 w-4 shrink-0" />
          <span>Aviso legal aceptado</span>
        </div>
      )}
      <p className="mt-4 text-sm text-[#6b7280]">
        Al confirmar, se creara la reserva con estado <strong>pendiente de pago</strong>. A
        continuacion recibiras el link para pagar solo la reserva online.
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

export function BookingWizard({ brands, models, services, technicians }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<Step>(() => {
    const current = parseInt(searchParams.get("step") ?? "1")
    return (current >= 1 && current <= 5 ? current : 1) as Step
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
  const hasTrackedBookingStart = useRef(false)

  const model = models.find((item) => item.id === state.scooterModelId)
  const service = services.find((item) => item.id === state.serviceId)
  const technician = technicians.find((item) => item.id === state.technicianId)

  const syncUrl = useCallback(
    (newState: Partial<WizardState>, newStep: Step) => {
      const params = new URLSearchParams()
      params.set("step", String(newStep))
      if (newState.scooterModelId ?? state.scooterModelId) {
        params.set("model", newState.scooterModelId ?? state.scooterModelId)
      }
      if (newState.serviceId ?? state.serviceId) {
        params.set("service", newState.serviceId ?? state.serviceId)
      }
      if (newState.technicianId ?? state.technicianId) {
        params.set("technician", newState.technicianId ?? state.technicianId)
      }
      if (newState.scheduledDate ?? state.scheduledDate) {
        params.set("date", newState.scheduledDate ?? state.scheduledDate)
      }
      router.replace(`/booking/new?${params.toString()}`, { scroll: false })
    },
    [router, state],
  )

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  function canAdvance() {
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

    if (step === 5) {
      void handleSubmit()
      return
    }

    const nextStep = (step + 1) as Step
    if (nextStep === 5 && requiresBookingDisclaimer(service) && !state.disclaimerAccepted) {
      setShowDisclaimer(true)
      return
    }

    if (!hasTrackedBookingStart.current && step === 1 && state.scooterModelId) {
      hasTrackedBookingStart.current = true
      trackAnalyticsEvent("booking_started", {
        scooter_model_id: state.scooterModelId,
      })
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
        data?: { booking: { id: string; serviceFee?: number }; paymentLinkUrl?: string | null }
        error?: string
      }

      if (!res.ok || !json.success) {
        setError(json.error ?? "Error al crear la reserva. Intenta de nuevo.")
        return
      }

      const bookingId = json.data?.booking?.id
      const paymentLinkUrl = json.data?.paymentLinkUrl

      if (!bookingId) {
        setError("Error inesperado al crear la reserva.")
        return
      }

      if (paymentLinkUrl) {
        trackAnalyticsEvent("payment_initiated", {
          booking_id: bookingId,
          service_id: state.serviceId,
          technician_id: state.technicianId,
          service_fee: json.data?.booking.serviceFee ?? 0,
        })

        if (process.env.NEXT_PUBLIC_E2E_AUTH === "enabled") {
          window.sessionStorage.setItem("sb:e2e-payment-link", paymentLinkUrl)
          return
        }

        window.location.href = paymentLinkUrl
      } else {
        router.push(`/booking/${bookingId}`)
      }
    } catch {
      setError("Error de conexion. Revisa tu internet e intenta de nuevo.")
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

  function handleSelectModel(id: string) {
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
        onDecline={() => setShowDisclaimer(false)}
      />

      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <Stepper currentStep={step} />

        <div className="min-h-[300px]">
          {step === 1 && (
            <StepScooter
              brands={brands}
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

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step >= 3 &&
          technician &&
          service &&
          (() => {
            const pricing = technician.pricing[service.id]
            if (!pricing) return null
            const { serviceFee } = calculatePricing(pricing.basePrice)

            return (
              <div className="mt-4 flex items-center justify-between rounded-lg bg-[#d1fae5] px-4 py-3">
                <span className="text-sm text-[#065f46]">
                  Reserva online fija a pagar ahora ({formatUYU(DEFAULT_SERVICE_FEE_AMOUNT)})
                </span>
                <span className="text-lg font-bold text-[#10b981]">
                  {formatUYU(serviceFee)}
                </span>
              </div>
            )
          })()}

        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" onClick={handleBack} disabled={step === 1 || submitting}>
            <ChevronLeft className="h-4 w-4" />
            Atras
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
