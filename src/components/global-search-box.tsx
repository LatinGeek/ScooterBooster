"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Bike, LoaderCircle, Search, UserRound, Wrench } from "lucide-react"
import { useRouter } from "next/navigation"
import type { ApiResponse } from "@/types"

interface SearchScooterResult {
  id: string
  name: string
  slug: string
}

interface SearchServiceResult {
  id: string
  name: string
  slug: string
}

interface SearchTechnicianResult {
  id: string
  displayName: string
  location: string
}

interface SearchPreviewResults {
  scooters: SearchScooterResult[]
  services: SearchServiceResult[]
  technicians: SearchTechnicianResult[]
}

interface GlobalSearchBoxProps {
  initialQuery?: string
  placeholder?: string
  inputId?: string
  className?: string
  inputClassName?: string
  wrapperClassName?: string
  panelClassName?: string
  compact?: boolean
  autoFocus?: boolean
  onNavigate?: () => void
}

const EMPTY_RESULTS: SearchPreviewResults = {
  scooters: [],
  services: [],
  technicians: [],
}

function getHasResults(results: SearchPreviewResults) {
  return (
    results.scooters.length > 0 || results.services.length > 0 || results.technicians.length > 0
  )
}

export function GlobalSearchBox({
  initialQuery = "",
  placeholder = "Buscar scooters, servicios o técnicos",
  inputId,
  className,
  inputClassName,
  wrapperClassName,
  panelClassName,
  compact = false,
  autoFocus = false,
  onNavigate,
}: GlobalSearchBoxProps) {
  const router = useRouter()
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchPreviewResults>(EMPTY_RESULTS)
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 2) {
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true)

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}&limit=4`, {
          signal: controller.signal,
        })

        const payload = (await response.json()) as ApiResponse<SearchPreviewResults>
        if (payload.success && payload.data) {
          setResults(payload.data)
        } else {
          setResults(EMPTY_RESULTS)
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults(EMPTY_RESULTS)
        }
      } finally {
        setIsLoading(false)
      }
    }, 220)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [query])

  const showPanel = isFocused && query.trim().length >= 2
  const hasResults = getHasResults(results)

  function handleQueryChange(nextValue: string) {
    setQuery(nextValue)

    if (nextValue.trim().length < 2) {
      setResults(EMPTY_RESULTS)
      setIsLoading(false)
    }
  }

  function navigateTo(href: string) {
    setIsFocused(false)
    startTransition(() => {
      router.push(href)
      onNavigate?.()
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    navigateTo(`/search?q=${encodeURIComponent(trimmedQuery)}`)
  }

  return (
    <div ref={wrapperRef} className={wrapperClassName}>
      <form onSubmit={handleSubmit} className={className}>
        <div className={inputClassName}>
          <Search className="h-4 w-4 text-[#6b7280]" />
          <input
            id={inputId}
            type="search"
            value={query}
            autoFocus={autoFocus}
            placeholder={placeholder}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => setIsFocused(true)}
            className="w-full bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
          />
          {isLoading || isPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin text-[#9ca3af]" />
          ) : null}
        </div>
      </form>

      {showPanel ? (
        <div
          className={
            panelClassName ??
            "mt-3 rounded-3xl border border-[#e5e7eb] bg-white p-4 shadow-xl shadow-slate-200/60"
          }
        >
          {hasResults ? (
            <div className="space-y-4">
              {results.scooters.length > 0 ? (
                <section>
                  <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#10b981] uppercase">
                    Scooters
                  </p>
                  <div className="space-y-2">
                    {results.scooters.map((scooter) => (
                      <button
                        key={scooter.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => navigateTo(`/scooters/${scooter.slug}`)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors duration-200 hover:bg-[#f8fafc]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#ecfdf5]">
                          <Bike className="h-4 w-4 text-[#059669]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">{scooter.name}</p>
                          <p className="text-xs text-[#6b7280]">Ver ficha del modelo</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {results.services.length > 0 ? (
                <section>
                  <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#2563eb] uppercase">
                    Servicios
                  </p>
                  <div className="space-y-2">
                    {results.services.map((service) => (
                      <button
                        key={service.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => navigateTo(`/services#${service.slug}`)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors duration-200 hover:bg-[#f8fafc]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eff6ff]">
                          <Wrench className="h-4 w-4 text-[#2563eb]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">{service.name}</p>
                          <p className="text-xs text-[#6b7280]">Explorar servicio</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              {results.technicians.length > 0 ? (
                <section>
                  <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-[#b45309] uppercase">
                    Técnicos
                  </p>
                  <div className="space-y-2">
                    {results.technicians.map((technician) => (
                      <button
                        key={technician.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => navigateTo(`/technicians/${technician.id}`)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors duration-200 hover:bg-[#f8fafc]"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#fef3c7]">
                          <UserRound className="h-4 w-4 text-[#b45309]" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">
                            {technician.displayName}
                          </p>
                          <p className="text-xs text-[#6b7280]">{technician.location}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => navigateTo(`/search?q=${encodeURIComponent(query.trim())}`)}
                className="inline-flex cursor-pointer text-sm font-semibold text-[#10b981] transition-colors duration-200 hover:text-[#059669]"
              >
                Ver todos los resultados
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#f8fafc] px-4 py-5 text-center">
              <p className="text-sm font-semibold text-[#111827]">Sin coincidencias rápidas</p>
              <p className="mt-1 text-xs text-[#6b7280]">
                {compact
                  ? "Seguimos buscando. Probá con otra palabra o abrí la búsqueda completa."
                  : "Probá con otra palabra o seguí a la búsqueda completa para explorar más."}
              </p>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => navigateTo(`/search?q=${encodeURIComponent(query.trim())}`)}
                className="mt-3 inline-flex cursor-pointer text-sm font-semibold text-[#10b981] transition-colors duration-200 hover:text-[#059669]"
              >
                Abrir búsqueda completa
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
