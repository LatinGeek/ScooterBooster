import Link from "next/link"
import { AlertTriangle, Clock, Cpu, Gauge, Navigation, Wrench } from "lucide-react"
import type { Service } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const categoryIcons = {
  "speed-limit": Gauge,
  firmware: Cpu,
  "cruise-control": Navigation,
  maintenance: Wrench,
} as const

const categoryLabels = {
  "speed-limit": "Deslimitación",
  firmware: "Firmware",
  "cruise-control": "Control de crucero",
  maintenance: "Mantenimiento",
} as const

interface ServiceCardProps {
  service: Service
  basePrice?: number
}

export function ServiceCard({ service, basePrice }: ServiceCardProps) {
  const Icon = categoryIcons[service.category] ?? Wrench
  const categoryLabel = categoryLabels[service.category] ?? service.category

  return (
    <Card className="flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d1fae5]">
            <Icon className="h-6 w-6 text-[#059669]" />
          </div>
          {service.requiresDisclaimer && (
            <Badge variant="warning" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Aviso legal
            </Badge>
          )}
        </div>
        <CardTitle className="mt-3">{service.name}</CardTitle>
        <div className="flex items-center gap-1 text-xs text-[#9ca3af]">
          <Clock className="h-3.5 w-3.5" />
          <span>~{service.estimatedDuration} min</span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="flex-1 text-sm text-[#6b7280]">{service.description}</p>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{categoryLabel}</Badge>
        </div>

        {basePrice !== undefined && (
          <p className="text-lg font-bold text-[#111827]">
            desde ${basePrice.toLocaleString("es-UY")} UYU
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Link
            href={`/services/${service.slug}`}
            className="text-sm font-semibold text-[#10b981] transition-colors hover:text-[#059669] hover:underline"
          >
            Ver detalle del servicio
          </Link>
          <Button asChild className="w-full">
            <Link href={`/booking/new?service=${service.id}`}>Reservar servicio</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

