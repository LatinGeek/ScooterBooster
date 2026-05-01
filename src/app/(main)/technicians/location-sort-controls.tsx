"use client"

import { useState, useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
import { LocateFixed, LoaderCircle, MapPinned } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LocationSortControlsProps {
  initialSearch: string
  hasNearbySort: boolean
}

export function LocationSortControls({ initialSearch, hasNearbySort }: LocationSortControlsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isLocating, setIsLocating] = useState(false)

  function updateUrl(updater: (params: URLSearchParams) => void) {
    startTransition(() => {
      const params = new URLSearchParams(initialSearch)
      updater(params)
      const nextQuery = params.toString()
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    })
  }

  function handleUseMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Tu navegador no permite usar ubicacion en este momento.")
      return
    }

    setError(null)
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(4))
        const longitude = Number(position.coords.longitude.toFixed(4))

        updateUrl((params) => {
          params.set("lat", String(latitude))
          params.set("lng", String(longitude))
          params.set("near", "mi-ubicacion")
        })

        setIsLocating(false)
      },
      () => {
        setError("No pudimos leer tu ubicacion. Proba nuevamente o elegi una zona manualmente.")
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
    )
  }

  return (
    <div className="rounded-[1.5rem] border border-[#e5e7eb] bg-[#f8fafc] p-3.5">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#ecfdf5]">
          <MapPinned className="h-[18px] w-[18px] text-[#059669]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#111827]">Descubrimiento por cercania</p>
          <p className="mt-0.5 text-xs leading-5 text-[#6b7280]">
            Ordena por proximidad aproximada usando tu ubicacion.
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="sm"
          className="h-9 sm:flex-1"
          onClick={handleUseMyLocation}
          disabled={isLocating || isPending}
        >
          {isLocating || isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          Usar mi ubicacion
        </Button>

        {hasNearbySort ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 sm:flex-1"
            onClick={() =>
              updateUrl((params) => {
                params.delete("lat")
                params.delete("lng")
                params.delete("near")
              })
            }
            disabled={isPending}
          >
            Quitar cercania
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-[#b45309]">{error}</p> : null}
    </div>
  )
}
