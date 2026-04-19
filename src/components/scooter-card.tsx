import Image from "next/image"
import Link from "next/link"
import { ChevronRight, Zap, Route, Battery } from "lucide-react"
import type { ScooterModel } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ScooterCardProps {
  model: ScooterModel
  brandName: string
}

export function ScooterCard({ model, brandName }: ScooterCardProps) {
  return (
    <Link href={`/scooters/${model.slug}`} className="block">
      <Card className="group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="p-5">
          <div className="relative mb-4 overflow-hidden rounded-xl border border-[#e5e7eb] bg-[radial-gradient(circle_at_top,#ecfdf5,white_70%)]">
            {model.imageURL ? (
              <Image
                src={model.imageURL}
                alt={`Foto del ${model.name}`}
                width={640}
                height={400}
                className="h-44 w-full object-contain p-4 transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-44 items-center justify-center">
                <div className="rounded-full bg-white/80 p-4 shadow-sm">
                  <Zap className="h-8 w-8 text-[#10b981]" />
                </div>
              </div>
            )}
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[#10b981] uppercase">
                {brandName}
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-[#111827] transition-colors duration-150 group-hover:text-[#10b981]">
                {model.name}
              </h3>
            </div>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#9ca3af] transition-transform duration-150 group-hover:translate-x-0.5" />
          </div>

          {/* Specs */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center rounded-lg bg-[#f9fafb] px-2 py-2.5 text-center">
              <Zap className="h-4 w-4 text-[#10b981]" />
              <span className="mt-1 text-xs font-semibold text-[#111827]">
                {model.specs.maxSpeed} km/h
              </span>
              <span className="text-[10px] text-[#9ca3af]">Vel. máx</span>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-[#f9fafb] px-2 py-2.5 text-center">
              <Route className="h-4 w-4 text-[#10b981]" />
              <span className="mt-1 text-xs font-semibold text-[#111827]">
                {model.specs.range} km
              </span>
              <span className="text-[10px] text-[#9ca3af]">Autonomía</span>
            </div>
            <div className="flex flex-col items-center rounded-lg bg-[#f9fafb] px-2 py-2.5 text-center">
              <Battery className="h-4 w-4 text-[#10b981]" />
              <span className="mt-1 text-xs font-semibold text-[#111827]">
                {model.specs.battery}
              </span>
              <span className="text-[10px] text-[#9ca3af]">Batería</span>
            </div>
          </div>

          {/* Compatible services count */}
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-[#6b7280]">
              {model.compatibleServices.length} servicio
              {model.compatibleServices.length !== 1 ? "s" : ""} disponible
              {model.compatibleServices.length !== 1 ? "s" : ""}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {model.specs.motor}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
