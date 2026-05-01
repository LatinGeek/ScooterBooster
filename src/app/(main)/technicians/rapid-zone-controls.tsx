"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"
import type { UruguayLocationPreset } from "@/lib/uruguay-locations"

interface RapidZoneControlsProps {
  initialSearch: string
  presets: UruguayLocationPreset[]
  selectedNear: string
  selectedLocation: string
}

export function RapidZoneControls({
  initialSearch,
  presets,
  selectedNear,
  selectedLocation,
}: RapidZoneControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function updateUrl(updater: (params: URLSearchParams) => void) {
    startTransition(() => {
      const params = new URLSearchParams(initialSearch)
      updater(params)
      const nextQuery = params.toString()
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    })
  }

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {presets.map((preset) => {
        const isActive =
          selectedNear === preset.slug || (selectedNear.length === 0 && selectedLocation === preset.label)

        return (
          <button
            key={preset.slug}
            type="button"
            disabled={isPending}
            onClick={() =>
              updateUrl((params) => {
                if (isActive) {
                  params.delete("location")
                  params.delete("near")
                  params.delete("lat")
                  params.delete("lng")
                  return
                }

                params.set("location", preset.label)
                params.set("near", preset.slug)
                params.delete("lat")
                params.delete("lng")
              })
            }
            className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-200 ${
              isActive
                ? "bg-[#111827] text-white"
                : "bg-white text-[#374151] hover:bg-[#e2e8f0]"
            } ${isPending ? "cursor-wait opacity-70" : "cursor-pointer"}`}
          >
            {preset.label}
          </button>
        )
      })}
    </div>
  )
}
