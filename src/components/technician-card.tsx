"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Check, MapPin, Star, Wrench } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Technician } from "@/types"

interface TechnicianCardProps {
  technician: Technician
  distanceKm?: number | null
  href?: string
  variant?: "full" | "compact"
  selected?: boolean
  onSelect?: (() => void) | null
  serviceId?: string
}

function formatDistance(distanceKm: number): string {
  return distanceKm < 10 ? distanceKm.toFixed(1) : String(Math.round(distanceKm))
}

function formatServiceLabel(serviceId: string): string {
  return serviceId
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}

function formatUYU(amount: number): string {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStartingPrice(technician: Technician, serviceId?: string): number | null {
  if (serviceId) {
    const servicePricing = technician.pricing[serviceId]?.basePrice
    return Number.isFinite(servicePricing) ? servicePricing : null
  }

  const prices = Object.values(technician.pricing)
    .map((pricing) => pricing.basePrice)
    .filter((price) => Number.isFinite(price))

  if (prices.length === 0) return null
  return Math.min(...prices)
}

export function TechnicianCard({
  technician,
  distanceKm,
  href,
  variant = "full",
  selected = false,
  onSelect = null,
  serviceId,
}: TechnicianCardProps) {
  const router = useRouter()
  const technicianHref = href ?? `/technicians/${technician.slug}`
  const initials = technician.displayName
    .split(" ")
    .map((chunk) => chunk[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  const startingPrice = getStartingPrice(technician, serviceId)

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onSelect ?? (() => router.push(technicianHref))}
        className={`flex w-full cursor-pointer items-start gap-4 rounded-xl border-2 p-4 text-left transition-all duration-150 hover:border-[#10b981] ${
          selected ? "border-[#10b981] bg-[#d1fae5]" : "border-[#e5e7eb] bg-white"
        }`}
      >
        <Avatar className="h-12 w-12 shrink-0 border border-[#d1d5db] bg-white">
          {technician.photoURL ? (
            <AvatarImage src={technician.photoURL} alt={technician.displayName} />
          ) : null}
          <AvatarFallback className="bg-[#10b981] font-semibold text-white">{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[#111827]">{technician.displayName}</p>
            <span className="flex items-center gap-1 text-xs font-medium text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              {technician.rating.toFixed(1)}
              <span className="font-normal text-[#9ca3af]">({technician.reviewCount})</span>
            </span>
          </div>
          <p className="mt-0.5 truncate text-sm text-[#6b7280]">{technician.location}</p>
          {startingPrice !== null ? (
            <p className="mt-1 text-sm font-semibold text-[#10b981]">
              Servicio técnico {formatUYU(startingPrice)}
            </p>
          ) : null}
        </div>

        {selected ? <Check className="h-5 w-5 shrink-0 text-[#10b981]" /> : null}
      </button>
    )
  }

  return (
    <Card
      role="link"
      tabIndex={0}
      onClick={() => router.push(technicianHref)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          router.push(technicianHref)
        }
      }}
      className="group h-full cursor-pointer overflow-hidden rounded-[1.75rem] border border-[#dbe4ea] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#bbf7d0] hover:shadow-[0_26px_60px_-35px_rgba(16,185,129,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] focus-visible:ring-offset-2"
    >
      <CardContent className="flex h-full flex-col p-0">
        <div className="border-b border-[#eef2f7] bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_62%,#ecfeff_100%)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-16 w-16 flex-shrink-0 border-4 border-white shadow-sm">
                {technician.photoURL ? (
                  <AvatarImage src={technician.photoURL} alt={technician.displayName} />
                ) : null}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#10b981]">
                  Técnico verificado
                </p>
                <Link
                  href={technicianHref}
                  className="mt-1 line-clamp-2 block text-lg font-bold leading-6 text-[#111827] transition-colors duration-200 hover:text-[#059669]"
                >
                  {technician.displayName}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#4b5563]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#9ca3af]" />
                    <span className="line-clamp-1">{technician.location}</span>
                  </span>
                  {distanceKm !== null && distanceKm !== undefined ? (
                    <span className="text-[#6b7280]">a {formatDistance(distanceKm)} km</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/90 px-3 py-2 text-right shadow-sm">
              <div className="flex items-center justify-end gap-1">
                <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />
                <span className="text-sm font-bold text-[#111827]">
                  {technician.rating.toFixed(1)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#6b7280]">{technician.reviewCount} reseñas</p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="min-h-[2.75rem]">
            {technician.bio ? (
              <p className="line-clamp-2 text-sm leading-5 text-[#4b5563]">{technician.bio}</p>
            ) : null}
          </div>

          <div className="mt-4">
            <div className="inline-flex rounded-full border border-[#d1fae5] bg-[#f0fdf4] px-3 py-1.5 text-sm font-semibold text-[#047857]">
              {startingPrice !== null
                ? `Servicio más accesible desde ${startingPrice} UYU`
                : "Precio a consultar"}
            </div>
          </div>

          <div className="mt-4 flex-1">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <Wrench className="h-3.5 w-3.5 text-[#10b981]" />
              Especialidades
            </div>
            <div className="flex flex-wrap gap-2">
              {technician.services.slice(0, 3).map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="rounded-full border border-[#d1fae5] bg-[#f0fdf4] px-2.5 py-1 text-[11px] font-semibold text-[#047857]"
                >
                  {formatServiceLabel(item)}
                </Badge>
              ))}
              {technician.services.length > 3 ? (
                <Badge
                  variant="secondary"
                  className="rounded-full border border-[#e5e7eb] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475569]"
                >
                  +{technician.services.length - 3} más
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eef2f7] pt-3">
            <Link
              href={technicianHref}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#111827] transition-colors duration-200 group-hover:text-[#059669]"
            >
              Ver perfil completo
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
