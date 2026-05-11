"use client"

import { DollarSign, LocateFixed, MapPin, MessageSquareText, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TechnicianSortKey = "rating" | "reviewCount" | "price" | "distance"

interface TechnicianSortBarProps {
  activeSort: TechnicianSortKey
  canSortByDistance: boolean
  isLocating: boolean
  onRequestLocation: () => void
  onSortChange: (value: TechnicianSortKey) => void
}

const BASE_OPTIONS: Array<{
  value: Exclude<TechnicianSortKey, "distance">
  label: string
  icon: typeof Star
}> = [
  { value: "rating", label: "Mejor valorados", icon: Star },
  { value: "reviewCount", label: "Más reseñas", icon: MessageSquareText },
  { value: "price", label: "Menor precio", icon: DollarSign },
]

export function TechnicianSortBar({
  activeSort,
  canSortByDistance,
  isLocating,
  onRequestLocation,
  onSortChange,
}: TechnicianSortBarProps) {
  const options = canSortByDistance
    ? [
        ...BASE_OPTIONS,
        { value: "distance" as const, label: "Más cerca", icon: MapPin },
      ]
    : BASE_OPTIONS

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Ordená por lo que más te importa</p>
          <p className="mt-1 text-xs text-[#6b7280]">
            Priorizá reputación, experiencia, precio o cercanía.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          variant={canSortByDistance ? "secondary" : "outline"}
          className="rounded-full"
          onClick={onRequestLocation}
          disabled={isLocating}
        >
          <LocateFixed className={cn("h-4 w-4", isLocating && "animate-spin")} />
          {canSortByDistance ? "Ubicación lista" : "Usar mi ubicación"}
        </Button>
      </div>

      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2 px-1">
          {options.map((option) => {
            const Icon = option.icon
            const isActive = activeSort === option.value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onSortChange(option.value)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors",
                  isActive
                    ? "border-[#10b981] bg-[#10b981] text-white"
                    : "border-[#d1d5db] bg-white text-[#374151] hover:border-[#10b981] hover:text-[#059669]"
                )}
                aria-pressed={isActive}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
