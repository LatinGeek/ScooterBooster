"use client"

import dynamic from "next/dynamic"
import Image from "next/image"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Bike,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  List,
  Loader2,
  Map,
  MapPin,
  User,
  Wrench,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { DisclaimerModal } from "@/components/disclaimer-modal"
import { ScooterCard } from "@/components/scooter-card"
import { TechnicianCard } from "@/components/technician-card"
import { useGeolocation } from "@/hooks/use-geolocation"
import { trackAnalyticsEvent } from "@/lib/analytics"
import { requiresBookingDisclaimer } from "@/lib/booking-rules"
import { calculatePricing } from "@/lib/pricing"
import { slugify } from "@/lib/slugs"
import {
  getPriceForBooking,
  getTechnicianBookingPrice,
  isServiceAvailableFromAnyTechnicianForBooking,
  isTechnicianCompatibleForBooking,
} from "@/lib/technician-matrix"
import { getDistanceToTechnician } from "@/lib/technician-location"
import { getCoordinatesForLocation } from "@/lib/uruguay-locations"
import { cn } from "@/lib/utils"
import type { ScooterBrand, ScooterModel, Service, Technician } from "@/types"
import { TechnicianSortBar, type TechnicianSortKey } from "./technician-sort-bar"

const TechnicianMap = dynamic(
  () => import("@/components/technician-map").then((module) => module.TechnicianMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[60vh] min-h-[24rem] items-center justify-center rounded-[1.75rem] border border-[#dbe4ea] bg-[#f8fafc] text-sm font-medium text-[#6b7280]">
        Cargando mapa de tecnicos...
      </div>
    ),
  }
)

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
  serviceFeeAmount: number
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
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
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
  { label: "Técnico", icon: User },
  { label: "Horario", icon: Calendar },
  { label: "Confirmar", icon: ClipboardCheck },
]

const STEP_DESCRIPTIONS = [
  "Marca y modelo",
  "Trabajo a realizar",
  "Profesional verificado",
  "Día y horario",
  "Pago de reserva",
]

function Stepper({ currentStep }: { currentStep: Step }) {
  const currentIndex = currentStep - 1
  const currentLabel = STEPS[currentIndex]?.label ?? ""

  return (
    <nav
      aria-label="Pasos de la reserva"
      className="mb-4 rounded-2xl border border-[#dbe4ea] bg-white p-3 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-4 sm:hidden">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#9ca3af] uppercase">
            Paso {currentStep} de {STEPS.length}
          </p>
          <p className="mt-1 text-base font-semibold text-[#111827]">{currentLabel}</p>
        </div>
        <div className="rounded-full bg-[#d1fae5] px-3 py-1 text-xs font-semibold text-[#059669]">
          {Math.round((currentStep / STEPS.length) * 100)}%
        </div>
      </div>

      <div className="mb-3 sm:hidden">
        <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#10b981_0%,#34d399_100%)] transition-all duration-300"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="relative hidden sm:block">
        <div className="absolute top-5 right-[calc(10%-20px)] left-[calc(10%+20px)] h-[2px] rounded-full bg-[#e5e7eb]" />
        <div
          className="absolute top-5 left-[calc(10%+20px)] h-[2px] rounded-full bg-[linear-gradient(90deg,#10b981_0%,#34d399_100%)] transition-all duration-300"
          style={{
            width:
              currentStep === 1
                ? "0%"
                : `calc(${((currentStep - 1) / (STEPS.length - 1)) * 80}% - ${((currentStep - 1) / (STEPS.length - 1)) * 40}px)`,
          }}
        />
      </div>

      <ol className="grid grid-cols-5 gap-1 sm:flex sm:items-start sm:justify-between sm:gap-0">
        {STEPS.map((step, idx) => {
          const stepNum = (idx + 1) as Step
          const done = stepNum < currentStep
          const active = stepNum === currentStep
          const Icon = step.icon

          return (
            <li key={step.label} className="relative flex min-w-0 flex-col items-center sm:flex-1">
              <div
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm transition-all duration-300 sm:h-10 sm:w-10 ${
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

              <div className="mt-1.5 text-center">
                <p
                  className={`text-[10px] font-semibold sm:text-xs ${
                    active || done ? "text-[#111827]" : "text-[#9ca3af]"
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 hidden text-[11px] text-[#94a3b8] lg:block">
                  {STEP_DESCRIPTIONS[idx]}
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
  const visibleModels = selectedBrandId ? (modelsByBrand[selectedBrandId] ?? []) : []
  const selectedBrand = brandsWithModels.find((brand) => brand.id === selectedBrandId)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-[#10b981] uppercase">Paso uno</p>
        <h2 className="mt-2 text-xl leading-tight font-black text-[#111827] sm:text-2xl">
          ¿Cuál es tu scooter?
        </h2>
      </div>
      <p className="max-w-2xl text-sm leading-6 text-[#6b7280]">
        Primero elegí la marca y después seleccioná tu modelo.
      </p>

      <div className="overflow-hidden rounded-[1.25rem]">
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
                    className="group flex min-h-24 cursor-pointer items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#10b981] hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#10b981] focus-visible:outline-none"
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
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#9ca3af] uppercase">
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
  technicians,
  model,
  selected,
  onSelect,
}: {
  services: Service[]
  technicians: Technician[]
  model: ScooterModel | undefined
  selected: string
  onSelect: (id: string) => void
}) {
  const compatible = model
    ? services.filter((service) => model.compatibleServices.includes(service.id))
    : services

  const availabilityByServiceId = useMemo(
    () =>
      Object.fromEntries(
        compatible.map((service) => [
          service.id,
          model
            ? isServiceAvailableFromAnyTechnicianForBooking(
                technicians,
                service.id,
                model.id,
                model.brandId
              )
            : true,
        ])
      ) as Record<string, boolean>,
    [compatible, model, technicians]
  )

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-[#10b981] uppercase">Paso dos</p>
        <h2 className="mt-2 text-xl leading-tight font-black text-[#111827] sm:text-2xl">
          ¿Qué servicio necesitás?
        </h2>
      </div>
      {model && (
        <p className="text-sm leading-6 text-[#6b7280]">
          Servicios disponibles para <strong>{model.name}</strong>
        </p>
      )}
      <div className="space-y-3">
        {compatible.map((service) => (
          <div
            key={service.id}
            className="group relative"
            title={
              availabilityByServiceId[service.id]
                ? undefined
                : "Este servicio todavía no está disponible"
            }
          >
            <button
              type="button"
              onClick={() => {
                if (!availabilityByServiceId[service.id]) return
                onSelect(service.id)
              }}
              disabled={!availabilityByServiceId[service.id]}
              className={`flex min-h-28 w-full items-start gap-4 rounded-2xl border p-4 text-left shadow-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#10b981] focus-visible:outline-none ${
                !availabilityByServiceId[service.id]
                  ? "cursor-not-allowed border-[#e5e7eb] bg-[#f8fafc] text-[#9ca3af]"
                  : selected === service.id
                    ? "cursor-pointer border-[#10b981] bg-[#d1fae5] hover:border-[#10b981]"
                    : "cursor-pointer border-[#e5e7eb] bg-white hover:-translate-y-0.5 hover:border-[#10b981] hover:shadow-md"
              }`}
            >
              <Wrench
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  availabilityByServiceId[service.id] ? "text-[#10b981]" : "text-[#cbd5e1]"
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-semibold ${
                      availabilityByServiceId[service.id] ? "text-[#111827]" : "text-[#9ca3af]"
                    }`}
                  >
                    {service.name}
                  </p>
                  {service.requiresDisclaimer && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      Aviso legal
                    </span>
                  )}
                </div>
                <p
                  className={`mt-0.5 text-sm ${
                    availabilityByServiceId[service.id] ? "text-[#6b7280]" : "text-[#cbd5e1]"
                  }`}
                >
                  {service.description}
                </p>
                <p
                  className={`mt-1 text-xs ${
                    availabilityByServiceId[service.id] ? "text-[#9ca3af]" : "text-[#cbd5e1]"
                  }`}
                >
                  Duracion estimada: {service.estimatedDuration} min
                </p>
              </div>
              {selected === service.id && availabilityByServiceId[service.id] && (
                <Check className="h-5 w-5 shrink-0 text-[#10b981]" />
              )}
            </button>

            {!availabilityByServiceId[service.id] && (
              <span className="pointer-events-none absolute top-full left-1/2 z-20 mt-2 hidden w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-[#111827] px-3 py-2 text-xs font-medium text-white shadow-lg group-hover:block">
                Este servicio todavía no está disponible
              </span>
            )}
          </div>
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

export function LegacyStepTechnician({
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
    if (!service || !scooterModel) return false
    return isTechnicianCompatibleForBooking(
      technician,
      service.id,
      scooterModel.id,
      scooterModel.brandId
    )
  })

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-[#111827]">Elegí tu técnico</h2>
      <div className="space-y-3">
        {available.map((technician) => (
          <TechnicianCard
            key={technician.id}
            technician={technician}
            variant="compact"
            serviceId={service?.id}
            scooterModelId={scooterModel?.id}
            selected={selected === technician.id}
            onSelect={() => onSelect(technician.id)}
          />
        ))}
      </div>
      {available.length === 0 && (
        <p className="rounded-xl border border-[#e5e7eb] p-6 text-center text-[#6b7280]">
          No hay técnicos disponibles para esta combinación de servicio y scooter.
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
  const geolocation = useGeolocation()
  const [sortKey, setSortKey] = useState<TechnicianSortKey>("rating")
  const [viewMode, setViewMode] = useState<"list" | "map">(() => {
    if (typeof window === "undefined") return "list"

    const storedView = window.localStorage.getItem("sb:booking-technician-view")
    return storedView === "map" ? "map" : "list"
  })

  const hasUserLocation = geolocation.lat !== null && geolocation.lng !== null
  const userLocation =
    geolocation.lat !== null && geolocation.lng !== null
      ? { lat: geolocation.lat, lng: geolocation.lng }
      : null

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("sb:booking-technician-view", viewMode)
  }, [viewMode])

  useEffect(() => {
    if (geolocation.error) {
      toast.error("No pudimos acceder a tu ubicacion")
    }
  }, [geolocation.error])

  const available = useMemo(
    () =>
      technicians.filter((technician) => {
        if (!service || !scooterModel) return false
        return isTechnicianCompatibleForBooking(
          technician,
          service.id,
          scooterModel.id,
          scooterModel.brandId
        )
      }),
    [technicians, service, scooterModel]
  )

  useEffect(() => {
    if (available.length === 1 && selected !== available[0]?.id) {
      onSelect(available[0]!.id)
    }
  }, [available, onSelect, selected])

  const techniciansWithDistance = useMemo(
    () =>
      available.map((technician) => ({
        ...technician,
        distanceKm: hasUserLocation
          ? getDistanceToTechnician(
              technician,
              geolocation.lat ?? undefined,
              geolocation.lng ?? undefined
            )
          : null,
      })),
    [available, geolocation.lat, geolocation.lng, hasUserLocation]
  )

  const sortedTechnicians = useMemo(() => {
    const next = [...techniciansWithDistance]

    next.sort((left, right) => {
      const leftPrice =
        service && scooterModel
          ? (getPriceForBooking(left.pricingMatrix, service.id, scooterModel.id) ??
            Number.POSITIVE_INFINITY)
          : Number.POSITIVE_INFINITY
      const rightPrice =
        service && scooterModel
          ? (getPriceForBooking(right.pricingMatrix, service.id, scooterModel.id) ??
            Number.POSITIVE_INFINITY)
          : Number.POSITIVE_INFINITY

      if (sortKey === "distance") {
        if (
          left.distanceKm !== null &&
          right.distanceKm !== null &&
          left.distanceKm !== right.distanceKm
        ) {
          return left.distanceKm - right.distanceKm
        }
        if (left.distanceKm !== null && right.distanceKm === null) return -1
        if (left.distanceKm === null && right.distanceKm !== null) return 1
      }

      if (sortKey === "price" && leftPrice !== rightPrice) {
        return leftPrice - rightPrice
      }

      if (sortKey === "reviewCount" && left.reviewCount !== right.reviewCount) {
        return right.reviewCount - left.reviewCount
      }

      if (left.rating !== right.rating) return right.rating - left.rating
      if (left.reviewCount !== right.reviewCount) return right.reviewCount - left.reviewCount
      return leftPrice - rightPrice
    })

    return next
  }, [service, scooterModel, sortKey, techniciansWithDistance])

  const mappableTechnicians = useMemo(
    () =>
      sortedTechnicians.filter(
        (technician) =>
          (technician.coordinates ?? getCoordinatesForLocation(technician.location)) !== null
      ),
    [sortedTechnicians]
  )

  const unmappableTechnicians = useMemo(
    () =>
      sortedTechnicians.filter(
        (technician) =>
          (technician.coordinates ?? getCoordinatesForLocation(technician.location)) === null
      ),
    [sortedTechnicians]
  )

  async function handleRequestLocation() {
    const coordinates = await geolocation.request()
    if (coordinates) {
      setSortKey("distance")
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[1.5rem] border border-[#dbe4ea] bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_62%,#ecfeff_100%)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-[#10b981] uppercase">
              Paso tres
            </p>
            <h2 className="mt-2 text-xl leading-tight font-black text-[#111827] sm:text-2xl">
              Elegí tu técnico
            </h2>
            <p className="mt-1 text-sm text-[#6b7280]">
              Compará reputación, precio y cercanía antes de reservar.
            </p>
          </div>

          <div className="grid grid-cols-2 rounded-2xl border border-[#d1d5db] bg-white p-1 sm:inline-flex sm:rounded-full">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors sm:rounded-full",
                viewMode === "list"
                  ? "bg-[#10b981] text-white"
                  : "text-[#475569] hover:text-[#111827]"
              )}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={cn(
                "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors sm:rounded-full",
                viewMode === "map"
                  ? "bg-[#10b981] text-white"
                  : "text-[#475569] hover:text-[#111827]"
              )}
            >
              <Map className="h-4 w-4" />
              Mapa
            </button>
          </div>
        </div>

        <TechnicianSortBar
          activeSort={sortKey}
          canSortByDistance={hasUserLocation}
          isLocating={geolocation.loading}
          onRequestLocation={handleRequestLocation}
          onSortChange={setSortKey}
        />

        {available.length === 1 ? (
          <div className="rounded-2xl border border-[#d1fae5] bg-[#f0fdf4] px-4 py-3 text-sm font-medium text-[#047857]">
            Solo un técnico disponible para este servicio. Lo dejamos preseleccionado para que
            avances mas rápido.
          </div>
        ) : null}
      </div>

      {available.length === 0 ? (
        <p className="rounded-xl border border-[#e5e7eb] p-6 text-center text-[#6b7280]">
          No hay técnicos disponibles para esta combinación de servicio y scooter.
        </p>
      ) : viewMode === "list" ? (
        <div className="space-y-3">
          {sortedTechnicians.map((technician) => (
            <TechnicianCard
              key={technician.id}
              technician={technician}
              distanceKm={technician.distanceKm}
              variant="compact"
              serviceId={service?.id}
              selected={selected === technician.id}
              onSelect={() => onSelect(technician.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] md:items-start">
            <div className="hidden max-h-[60vh] space-y-3 overflow-y-auto pr-1 md:block">
              {mappableTechnicians.map((technician) => (
                <TechnicianCard
                  key={technician.id}
                  technician={technician}
                  distanceKm={technician.distanceKm}
                  variant="compact"
                  serviceId={service?.id}
                  selected={selected === technician.id}
                  onSelect={() => onSelect(technician.id)}
                />
              ))}
            </div>

            <div className="space-y-3">
              <TechnicianMap
                technicians={mappableTechnicians}
                selectedId={selected || null}
                userLocation={userLocation}
                onSelect={onSelect}
              />

              {selected ? (
                <div className="md:hidden">
                  {sortedTechnicians
                    .filter((technician) => technician.id === selected)
                    .map((technician) => (
                      <div
                        key={technician.id}
                        className="fixed inset-x-4 bottom-4 z-30 rounded-[1.5rem] border border-[#dbe4ea] bg-white p-3 shadow-[0_25px_80px_-30px_rgba(15,23,42,0.45)]"
                      >
                        <TechnicianCard
                          technician={technician}
                          distanceKm={technician.distanceKm}
                          variant="compact"
                          serviceId={service?.id}
                          selected
                          onSelect={() => onSelect(technician.id)}
                        />
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          </div>

          {unmappableTechnicians.length > 0 ? (
            <div className="rounded-[1.5rem] border border-[#e5e7eb] bg-white p-4">
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#94a3b8]" />
                <p className="text-sm font-semibold text-[#111827]">Sin ubicacion en mapa</p>
              </div>
              <div className="space-y-3">
                {unmappableTechnicians.map((technician) => (
                  <TechnicianCard
                    key={technician.id}
                    technician={technician}
                    distanceKm={technician.distanceKm}
                    variant="compact"
                    serviceId={service?.id}
                    selected={selected === technician.id}
                    onSelect={() => onSelect(technician.id)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
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
    const slots = availability?.isAvailable
      ? buildHourSlots(availability.start, availability.end)
      : []
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
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-[#10b981] uppercase">Paso cuatro</p>
        <h2 className="mt-2 text-xl leading-tight font-black text-[#111827] sm:text-2xl">
          Elegí fecha y hora
        </h2>
      </div>

      {technician && availabilityEntries.length > 0 && (
        <div className="rounded-2xl border border-[#dbe4ea] bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-[#374151]">Disponibilidad del técnico</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {availabilityEntries.map(([day, avail]) => (
              <li
                key={day}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#f8fafc] px-3 py-2 text-sm text-[#6b7280]"
              >
                <span className="font-medium text-[#374151]">{DAY_LABELS[day] ?? day}</span>
                <span>
                  {avail.start} - {avail.end}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
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
            className="mt-2 block h-12 w-full rounded-xl border border-[#d1d5db] bg-white px-4 text-sm text-[#111827] focus:border-[#10b981] focus:ring-2 focus:ring-[#bbf7d0] focus:outline-none"
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
            className="mt-2 block h-12 w-full rounded-xl border border-[#d1d5db] bg-white px-4 text-sm text-[#111827] focus:border-[#10b981] focus:ring-2 focus:ring-[#bbf7d0] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#f3f4f6] disabled:text-[#9ca3af]"
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

        <div className="sm:col-span-2">
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
            className="mt-2 block w-full resize-none rounded-xl border border-[#d1d5db] bg-white px-4 py-3 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#10b981] focus:ring-2 focus:ring-[#bbf7d0] focus:outline-none"
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
  serviceFeeAmount,
}: {
  wizardState: WizardState
  model: ScooterModel | undefined
  service: Service | undefined
  technician: Technician | undefined
  serviceFeeAmount: number
}) {
  const bookingPrice =
    technician && service && model
      ? getTechnicianBookingPrice(technician, service.id, model.id)
      : null
  const { basePrice, serviceFee, totalPrice } =
    bookingPrice !== null
      ? calculatePricing(bookingPrice, serviceFeeAmount)
      : { basePrice: 0, serviceFee: 0, totalPrice: 0 }

  const scheduled = wizardState.scheduledDate
    ? new Intl.DateTimeFormat("es-UY", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(new Date(wizardState.scheduledDate))
    : "-"

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold tracking-[0.18em] text-[#10b981] uppercase">Paso cinco</p>
        <h2 className="mt-2 text-xl leading-tight font-black text-[#111827] sm:text-2xl">
          Revisa tu reserva
        </h2>
      </div>
      <div className="divide-y divide-[#e5e7eb] overflow-hidden rounded-2xl border border-[#dbe4ea] bg-white shadow-sm">
        <Row label="Scooter" value={model?.name ?? "-"} />
        <Row label="Servicio" value={service?.name ?? "-"} />
        <Row label="Técnico" value={technician?.displayName ?? "-"} />
        <Row label="Fecha y hora" value={scheduled} />
        {wizardState.notes && <Row label="Notas" value={wizardState.notes} />}
        <div className="px-4 py-3">
          <div className="flex justify-between text-sm text-[#6b7280]">
            <span>Pago al técnico</span>
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
            {formatUYU(basePrice)} del servicio se coordinan directamente con el técnico.
          </p>
        </div>
      </div>
      {requiresBookingDisclaimer(service) && wizardState.disclaimerAccepted && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#d1fae5] bg-[#d1fae5] px-4 py-3 text-sm text-[#065f46]">
          <Check className="h-4 w-4 shrink-0" />
          <span>Aviso legal aceptado</span>
        </div>
      )}
      <p className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 text-sm leading-6 text-[#6b7280]">
        Al confirmar, se creara la reserva con estado <strong>pendiente de pago</strong>. A
        continuacion recibiras el link para pagar solo la reserva online.
      </p>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className="text-[#6b7280]">{label}</span>
      <span className="font-medium text-[#111827] sm:text-right">{value}</span>
    </div>
  )
}

function AnimatedStep({
  step,
  reduceMotion,
  children,
}: {
  step: Step
  reduceMotion: boolean
  children: React.ReactNode
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SelectionSummary({
  step,
  state,
  model,
  service,
  technician,
  serviceFeeAmount,
}: {
  step: Step
  state: WizardState
  model: ScooterModel | undefined
  service: Service | undefined
  technician: Technician | undefined
  serviceFeeAmount: number
}) {
  const bookingPrice =
    technician && service && model
      ? getTechnicianBookingPrice(technician, service.id, model.id)
      : null
  const pricing = bookingPrice !== null ? calculatePricing(bookingPrice, serviceFeeAmount) : null
  const scheduled = state.scheduledDate
    ? new Intl.DateTimeFormat("es-UY", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(state.scheduledDate))
    : "Sin horario"

  const items = [
    { label: "Scooter", value: model?.name ?? "Pendiente", done: Boolean(model) },
    { label: "Servicio", value: service?.name ?? "Pendiente", done: Boolean(service) },
    { label: "Técnico", value: technician?.displayName ?? "Pendiente", done: Boolean(technician) },
    { label: "Horario", value: scheduled, done: Boolean(state.scheduledDate) },
  ]

  return (
    <aside className="hidden rounded-[1.5rem] border border-[#dbe4ea] bg-[#020c0a] p-4 text-white shadow-[0_28px_70px_-48px_rgba(15,23,42,0.65)] lg:sticky lg:top-24 lg:block">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-[11px] font-bold tracking-[0.18em] text-[#34d399] uppercase">Progreso</p>
        <p className="mt-2 text-2xl font-black">{Math.round((step / STEPS.length) * 100)}%</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#10b981_0%,#34d399_100%)] transition-all duration-300"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-bold tracking-[0.14em] text-white/45 uppercase">
                {item.label}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">{item.value}</p>
            </div>
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                item.done
                  ? "border-[#34d399] bg-[#10b981] text-white"
                  : "border-white/15 bg-white/5 text-white/35"
              )}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-[#34d399]/25 bg-[#10b981]/10 p-4">
        <p className="text-xs font-semibold text-[#a7f3d0]">Reserva online</p>
        <p className="mt-1 text-2xl font-black text-white">
          {pricing ? formatUYU(pricing.serviceFee) : formatUYU(serviceFeeAmount)}
        </p>
        <p className="mt-2 text-xs leading-5 text-white/55">
          Pagás solo la seña para confirmar. El resto se coordina directo con el técnico.
        </p>
      </div>
    </aside>
  )
}

export function BookingWizard({ brands, models, services, technicians, serviceFeeAmount }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldReduceMotion = useReducedMotion()

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
  const selectedServiceAvailable = useMemo(() => {
    if (!service) return false
    if (!model) return true
    return isServiceAvailableFromAnyTechnicianForBooking(
      technicians,
      service.id,
      model.id,
      model.brandId
    )
  }, [model, service, technicians])

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
    [router, state]
  )

  function update(patch: Partial<WizardState>) {
    setState((prev) => ({ ...prev, ...patch }))
  }

  function canAdvance() {
    switch (step) {
      case 1:
        return !!state.scooterModelId
      case 2:
        return !!state.serviceId && selectedServiceAvailable
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

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
        animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="rounded-2xl border border-[#dbe4ea] bg-white p-3 shadow-sm sm:p-5"
      >
        <Stepper currentStep={step} />

        <div className="min-h-[300px] rounded-2xl border border-[#eef2f7] bg-[#f8fafc] p-4 sm:p-5 lg:p-6">
          <AnimatedStep step={step} reduceMotion={Boolean(shouldReduceMotion)}>
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
                technicians={technicians}
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
                serviceFeeAmount={serviceFeeAmount}
              />
            )}
          </AnimatedStep>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step >= 3 &&
          technician &&
          service &&
          model &&
          (() => {
            const pricing = getTechnicianBookingPrice(technician, service.id, model.id)
            if (pricing === null) return null
            const { serviceFee } = calculatePricing(pricing, serviceFeeAmount)

            return (
              <div className="mt-4 flex flex-col gap-1 rounded-2xl border border-[#bbf7d0] bg-[#d1fae5] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm font-medium text-[#065f46]">
                  Reserva online fija a pagar ahora ({formatUYU(serviceFeeAmount)})
                </span>
                <span className="text-lg font-bold text-[#10b981]">{formatUYU(serviceFee)}</span>
              </div>
            )
          })()}

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#e5e7eb] pt-4 sm:flex sm:items-center sm:justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || submitting}
            className="h-12 w-full sm:w-auto"
          >
            <ChevronLeft className="h-4 w-4" />
            Atras
          </Button>

          <Button
            onClick={handleNext}
            disabled={!canAdvance() || submitting}
            className="h-12 w-full sm:w-auto"
          >
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
      </motion.div>
    </>
  )
}
