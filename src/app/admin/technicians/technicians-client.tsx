"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  CheckCircle,
  Clock,
  ExternalLink,
  MapPin,
  PlusCircle,
  Search,
  Star,
  Wrench,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ScooterBrand, ScooterModel, Service, Technician } from "@/types"
import { CreateTechnicianModal } from "./create-technician-modal"
import { AvailabilityTab } from "./tabs/availability-tab"
import { PricingMatrixTab } from "./tabs/pricing-matrix-tab"
import { ProfileTab } from "./tabs/profile-tab"

interface Props {
  technicians: Technician[]
  services: Service[]
  models: ScooterModel[]
  brands: ScooterBrand[]
}

type StatusTab = "pending" | "approved" | "rejected"
type TechnicianTab = "profile" | "pricing" | "availability"

function statusLabel(technician: Technician) {
  if (technician.isApproved) return "Aprobado"
  if ((technician.applicationStatus ?? "pending") === "request_changes") return "Pide cambios"
  if ((technician.applicationStatus ?? "pending") === "rejected") return "Rechazado"
  return "Pendiente"
}

function statusStyles(technician: Technician) {
  if (technician.isApproved) return "bg-[#d1fae5] text-[#059669]"
  if ((technician.applicationStatus ?? "pending") === "request_changes") return "bg-blue-50 text-blue-700"
  if ((technician.applicationStatus ?? "pending") === "rejected") return "bg-red-50 text-red-600"
  return "bg-amber-50 text-amber-700"
}

export function AdminTechniciansClient({ technicians: initial, services, models, brands }: Props) {
  const [technicians, setTechnicians] = useState<Technician[]>(initial)
  const [statusTab, setStatusTab] = useState<StatusTab>("pending")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? "")
  const [createOpen, setCreateOpen] = useState(false)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<TechnicianTab>("profile")

  useEffect(() => {
    if (!selectedId && technicians[0]?.id) {
      setSelectedId(technicians[0].id)
    }
  }, [selectedId, technicians])

  const grouped: Record<StatusTab, Technician[]> = useMemo(
    () => ({
      pending: technicians.filter((technician) => (technician.applicationStatus ?? "pending") === "pending"),
      approved: technicians.filter((technician) => technician.isApproved),
      rejected: technicians.filter((technician) =>
        ["request_changes", "rejected"].includes(technician.applicationStatus ?? "pending"),
      ),
    }),
    [technicians],
  )

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return grouped[statusTab].filter((technician) => {
      if (!needle) return true
      return [
        technician.displayName,
        technician.bio,
        technician.location,
        technician.phone,
        technician.whatsappNumber,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    })
  }, [grouped, query, statusTab])

  const selectedTechnician = filtered.find((technician) => technician.id === selectedId) ?? filtered[0] ?? null

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((technician) => technician.id === selectedId)) {
      setSelectedId(filtered[0]!.id)
    }
    if (filtered.length === 0 && selectedId) {
      setSelectedId("")
    }
  }, [filtered, selectedId])

  async function refreshTechnicians() {
    const response = await fetch("/api/admin/technicians?status=all")
    const payload = (await response.json()) as { data?: Technician[]; error?: string }
    if (!response.ok || !payload.data) {
      toast.error(payload.error ?? "No pudimos actualizar la lista.")
      return
    }

    setTechnicians(payload.data)
    if (payload.data[0] && !payload.data.some((tech) => tech.id === selectedId)) {
      setSelectedId(payload.data[0].id)
    }
  }

  function selectTechnician(id: string) {
    setSelectedId(id)
  }

  async function moderateTechnician(id: string, action: "approve" | "request_changes" | "reject", reason?: string) {
    setLoadingAction(id)
    try {
      const response = await fetch(`/api/admin/technicians/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(payload.error ?? "No pudimos procesar la acción.")
        return
      }

      await refreshTechnicians()
      toast.success(
        action === "approve"
          ? "Técnico aprobado."
          : action === "request_changes"
            ? "Se pidió un ajuste."
            : "Técnico rechazado.",
      )
    } finally {
      setLoadingAction(null)
    }
  }

  async function saveProfile(payload: {
    displayName: string
    bio: string
    photoURL: string
    phone: string
    whatsappNumber: string
    location: string
    isActive: boolean
  }) {
    if (!selectedTechnician) return
    setLoadingAction(selectedTechnician.id)
    try {
      const response = await fetch(`/api/admin/technicians/${selectedTechnician.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", ...payload }),
      })
      const json = (await response.json()) as { data?: Technician; error?: string }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos guardar el perfil.")
        return
      }
      setTechnicians((current) => current.map((item) => (item.id === json.data!.id ? json.data! : item)))
      toast.success("Perfil actualizado.")
    } finally {
      setLoadingAction(null)
    }
  }

  async function saveMatrix(matrix: Technician["pricingMatrix"]) {
    if (!selectedTechnician) return
    setLoadingAction(selectedTechnician.id)
    try {
      const response = await fetch(`/api/admin/technicians/${selectedTechnician.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", pricingMatrix: matrix }),
      })
      const json = (await response.json()) as { data?: Technician; error?: string }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos guardar la matriz.")
        return
      }
      setTechnicians((current) => current.map((item) => (item.id === json.data!.id ? json.data! : item)))
      toast.success("Matriz actualizada.")
    } finally {
      setLoadingAction(null)
    }
  }

  async function saveAvailability(availability: Technician["availability"]) {
    if (!selectedTechnician) return
    setLoadingAction(selectedTechnician.id)
    try {
      const response = await fetch(`/api/admin/technicians/${selectedTechnician.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", availability }),
      })
      const json = (await response.json()) as { data?: Technician; error?: string }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos guardar los horarios.")
        return
      }
      setTechnicians((current) => current.map((item) => (item.id === json.data!.id ? json.data! : item)))
      toast.success("Horarios actualizados.")
    } finally {
      setLoadingAction(null)
    }
  }

  async function deleteTechnician(hard: boolean) {
    if (!selectedTechnician) return
    setLoadingAction(selectedTechnician.id)
    try {
      const response = await fetch(`/api/admin/technicians/${selectedTechnician.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", hard }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(json.error ?? "No pudimos eliminar el técnico.")
        return
      }
      await refreshTechnicians()
      toast.success(hard ? "Técnico eliminado." : "Técnico desactivado.")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <section>
      <CreateTechnicianModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void refreshTechnicians()}
      />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Gestión de técnicos</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Alta, moderación y edición de perfil, precios y horarios.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuevo técnico
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { key: "pending" as const, label: "Pendientes", count: grouped.pending.length },
          { key: "approved" as const, label: "Aprobados", count: grouped.approved.length },
          { key: "rejected" as const, label: "Rechazados", count: grouped.rejected.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusTab(tab.key)}
            className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
              statusTab === tab.key ? "border-[#10b981] bg-[#f0fdf4] text-[#059669]" : "border-[#e5e7eb] bg-white text-[#6b7280]"
            }`}
          >
            <span>{tab.label}</span>
            <span className="ml-2 text-xs text-[#9ca3af]">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.72fr)_minmax(760px,1.45fr)] 2xl:grid-cols-[minmax(320px,0.7fr)_minmax(860px,1.55fr)]">
        <div className="space-y-4">
          <div className="relative rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" placeholder="Buscar técnico" />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white py-16 text-center">
              <Wrench className="mb-4 h-10 w-10 text-[#d1d5db]" />
              <p className="text-sm text-[#9ca3af]">No hay técnicos en esta categoría.</p>
            </div>
          ) : (
            <div className="flex max-h-[calc(100vh-14rem)] flex-col gap-4 overflow-y-auto pr-1">
              {filtered.map((technician) => {
                const selected = selectedTechnician?.id === technician.id

                return (
                  <article
                    key={technician.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm transition-colors ${
                      selected ? "border-[#10b981] ring-2 ring-[#d1fae5]" : "border-[#e5e7eb] hover:border-[#cbd5e1]"
                    }`}
                  >
                    <button type="button" onClick={() => selectTechnician(technician.id)} className="w-full text-left">
                      <div className="mb-3 flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d1fae5] text-lg font-bold text-[#059669]">
                          {technician.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[#111827]">{technician.displayName}</p>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles(technician)}`}>
                              {statusLabel(technician) === "Aprobado" ? <CheckCircle className="h-3 w-3" /> : statusLabel(technician) === "Rechazado" ? <XCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                              {statusLabel(technician)}
                            </span>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                technician.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {technician.isActive ? "Activo" : "Pausado"}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-sm text-[#6b7280]">{technician.bio}</p>
                        </div>
                      </div>

                      <div className="mb-4 flex flex-wrap gap-3 text-xs text-[#6b7280]">
                        {technician.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {technician.location}
                          </span>
                        ) : null}
                        {technician.reviewCount > 0 ? (
                          <span className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />
                            {technician.rating.toFixed(1)} ({technician.reviewCount})
                          </span>
                        ) : null}
                      </div>
                    </button>

                    <div className="flex items-center justify-between border-t border-[#f3f4f6] pt-4 text-xs text-[#9ca3af]">
                      <span>{selected ? "Editor abierto" : "Abrir editor"}</span>
                      <Button variant="ghost" size="sm" asChild className="ml-auto text-[#6b7280]">
                        <Link href={`/technicians/${technician.id}`} target="_blank">
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          Ver perfil
                        </Link>
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm xl:sticky xl:top-8 xl:max-h-[calc(100vh-6rem)] xl:overflow-hidden">
          {selectedTechnician ? (
            <div className="flex h-full flex-col gap-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-[#111827]">{selectedTechnician.displayName}</h2>
                    <p className="mt-1 text-sm text-[#6b7280]">{selectedTechnician.location}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles(selectedTechnician)}`}>
                      {statusLabel(selectedTechnician)}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        selectedTechnician.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {selectedTechnician.isActive ? "Activo" : "Pausado"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#f3f4f6] p-1">
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { key: "profile" as const, label: "Perfil" },
                    { key: "pricing" as const, label: "Servicios & Precios" },
                    { key: "availability" as const, label: "Horarios" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setSelectedTab(tab.key)}
                      className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                        selectedTab === tab.key
                          ? "bg-white text-[#111827] shadow-sm"
                          : "text-[#6b7280] hover:text-[#111827]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 rounded-2xl border border-[#e5e7eb] bg-[#fafafa] p-4 xl:flex-1 xl:overflow-y-auto">
                {selectedTab === "profile" ? (
                  <ProfileTab
                    technician={selectedTechnician}
                    saving={loadingAction === selectedTechnician.id}
                    onSave={saveProfile}
                    onModerate={(action, reason) => moderateTechnician(selectedTechnician.id, action, reason)}
                    onDelete={deleteTechnician}
                  />
                ) : null}

                {selectedTab === "pricing" ? (
                  <PricingMatrixTab
                    technician={selectedTechnician}
                    services={services}
                    models={models}
                    brands={brands}
                    saving={loadingAction === selectedTechnician.id}
                    onSave={saveMatrix}
                  />
                ) : null}

                {selectedTab === "availability" ? (
                  <AvailabilityTab
                    technician={selectedTechnician}
                    saving={loadingAction === selectedTechnician.id}
                    onSave={saveAvailability}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center text-sm text-[#6b7280]">
              Seleccioná un técnico para editarlo.
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
