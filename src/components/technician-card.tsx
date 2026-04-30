"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { MapPin, Star } from "lucide-react"
import type { Technician } from "@/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { WhatsAppButton } from "./whatsapp-button"

interface TechnicianCardProps {
  technician: Technician
  distanceKm?: number | null
  href?: string
}

function formatDistance(distanceKm: number): string {
  return distanceKm < 10 ? distanceKm.toFixed(1) : String(Math.round(distanceKm))
}

export function TechnicianCard({ technician, distanceKm, href }: TechnicianCardProps) {
  const router = useRouter()
  const technicianHref = href ?? `/technicians/${technician.id}`
  const initials = technician.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

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
      className="cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] focus-visible:ring-offset-2"
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14 flex-shrink-0">
            {technician.photoURL && (
              <AvatarImage src={technician.photoURL} alt={technician.displayName} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <Link
                  href={technicianHref}
                  className="font-semibold text-[#111827] transition-colors duration-200 hover:text-[#10b981]"
                >
                  {technician.displayName}
                </Link>
                <div className="mt-0.5 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#9ca3af]" />
                  <span className="text-xs text-[#6b7280]">{technician.location}</span>
                  {distanceKm !== null && distanceKm !== undefined ? (
                    <span className="text-xs text-[#9ca3af]">
                      {" · "}a {formatDistance(distanceKm)} km
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <Star className="h-4 w-4 fill-[#f59e0b] text-[#f59e0b]" />
                <span className="text-sm font-semibold text-[#111827]">
                  {technician.rating.toFixed(1)}
                </span>
                <span className="text-xs text-[#9ca3af]">({technician.reviewCount})</span>
              </div>
            </div>

            {technician.bio && (
              <p className="mt-2 line-clamp-2 text-sm text-[#6b7280]">{technician.bio}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {technician.services.slice(0, 3).map((serviceId) => (
                <Badge key={serviceId} variant="default" className="text-xs">
                  {serviceId}
                </Badge>
              ))}
              {technician.services.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{technician.services.length - 3}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Link
            href={technicianHref}
            className="text-sm font-medium text-[#10b981] transition-colors duration-200 hover:text-[#059669]"
          >
            Ver perfil →
          </Link>
          <div
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <WhatsAppButton
              phoneNumber={technician.whatsappNumber}
              message={`Hola ${technician.displayName}, vi tu perfil en ScooterBooster y me gustaría consultar sobre tus servicios.`}
              variant="icon"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
