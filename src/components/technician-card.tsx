"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, MapPin, Star, Wrench } from "lucide-react"
import type { Technician } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface TechnicianCardProps {
  technician: Technician
  distanceKm?: number | null
  href?: string
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

function getStartingPrice(technician: Technician): number | null {
  const prices = Object.values(technician.pricing)
    .map((pricing) => pricing.basePrice)
    .filter((price) => Number.isFinite(price))

  if (prices.length === 0) return null
  return Math.min(...prices)
}

export function TechnicianCard({ technician, distanceKm, href }: TechnicianCardProps) {
  const router = useRouter()
  const technicianHref = href ?? `/technicians/${technician.slug}`
  const initials = technician.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
  const startingPrice = getStartingPrice(technician)

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
      className="group cursor-pointer overflow-hidden rounded-[2rem] border border-[#dbe4ea] bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#bbf7d0] hover:shadow-[0_26px_60px_-35px_rgba(16,185,129,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] focus-visible:ring-offset-2"
    >
      <CardContent className="p-0">
        <div className="border-b border-[#eef2f7] bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_62%,#ecfeff_100%)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="h-18 w-18 flex-shrink-0 border-4 border-white shadow-sm">
                {technician.photoURL && (
                  <AvatarImage src={technician.photoURL} alt={technician.displayName} />
                )}
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.22em] text-[#10b981] uppercase">
                  Tecnico verificado
                </p>
                <Link
                  href={technicianHref}
                  className="mt-1 block text-xl font-bold text-[#111827] transition-colors duration-200 hover:text-[#059669]"
                >
                  {technician.displayName}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#4b5563]">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#9ca3af]" />
                    {technician.location}
                  </span>
                  {distanceKm !== null && distanceKm !== undefined ? (
                    <span className="text-[#6b7280]">a {formatDistance(distanceKm)} km</span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/90 px-3 py-2 text-right shadow-sm">
              <div className="flex items-center justify-end gap-1">
                <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" />
                <span className="text-base font-bold text-[#111827]">
                  {technician.rating.toFixed(1)}
                </span>
              </div>
              <p className="mt-1 text-xs text-[#6b7280]">{technician.reviewCount} resenas</p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {technician.bio ? (
            <p className="line-clamp-3 text-sm leading-6 text-[#4b5563]">{technician.bio}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-[#64748b] uppercase">
                Desde
              </p>
              <p className="mt-2 text-lg font-bold text-[#111827]">
                {startingPrice ? `${startingPrice} UYU` : "Consultar"}
              </p>
            </div>
            <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
              <p className="text-xs font-semibold tracking-[0.16em] text-[#64748b] uppercase">
                Servicios
              </p>
              <p className="mt-2 text-lg font-bold text-[#111827]">{technician.services.length}</p>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <Wrench className="h-4 w-4 text-[#10b981]" />
              Especialidades
            </div>
            <div className="flex flex-wrap gap-2">
              {technician.services.slice(0, 3).map((serviceId) => (
                <Badge
                  key={serviceId}
                  variant="secondary"
                  className="rounded-full border border-[#d1fae5] bg-[#f0fdf4] px-3 py-1 text-xs font-semibold text-[#047857]"
                >
                  {formatServiceLabel(serviceId)}
                </Badge>
              ))}
              {technician.services.length > 3 ? (
                <Badge
                  variant="secondary"
                  className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1 text-xs font-semibold text-[#475569]"
                >
                  +{technician.services.length - 3} mas
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-[#eef2f7] pt-4">
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
