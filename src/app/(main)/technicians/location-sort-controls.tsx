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
      setError("Tu navegador no permite usar ubicación en este momento.")
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
        setError("No pudimos leer tu ubicación. Probá nuevamente o elegí una zona manualmente.")
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 600000 }
    )
  }

  return (
    <div className="rounded-3xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ecfdf5]">
          <MapPinned className="h-5 w-5 text-[#059669]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#111827]">Descubrimiento por cercanía</p>
          <p className="mt-1 text-xs leading-5 text-[#6b7280]">
            Ordená técnicos por proximidad aproximada usando tu ubicación del navegador.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          size="sm"
          className="sm:flex-1"
          onClick={handleUseMyLocation}
          disabled={isLocating || isPending}
        >
          {isLocating || isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4" />
          )}
          Usar mi ubicación
        </Button>

        {hasNearbySort ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="sm:flex-1"
            onClick={() =>
              updateUrl((params) => {
                params.delete("lat")
                params.delete("lng")
                params.delete("near")
              })
            }
            disabled={isPending}
          >
            Quitar cercanía
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-xs text-[#b45309]">{error}</p> : null}
    </div>
  )
}
