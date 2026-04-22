"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  CheckCircle,
  Clock,
  ExternalLink,
  MapPin,
  Save,
  Search,
  Star,
  Wrench,
  XCircle,
} from "lucide-react"
import { trackAnalyticsEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ScooterBrand, Service, Technician } from "@/types"

interface Props {
  technicians: Technician[]
  services: Service[]
  brands: ScooterBrand[]
}

type Tab = "pending" | "approved" | "rejected"

type TechnicianOverrideDraft = {
  displayName: string
  bio: string
  photoURL: string
  phone: string
  whatsappNumber: string
  location: string
  services: string[]
  supportedBrands: string[]
  isActive: boolean
}

type ModerationAction = "approve" | "request_changes" | "reject"

function buildDraft(technician: Technician): TechnicianOverrideDraft {
  return {
    displayName: technician.displayName,
    bio: technician.bio,
    photoURL: technician.photoURL,
    phone: technician.phone,
    whatsappNumber: technician.whatsappNumber,
    location: technician.location,
    services: technician.services,
    supportedBrands: technician.supportedBrands,
    isActive: technician.isActive,
  }
}

export function AdminTechniciansClient({ technicians: initial, services, brands }: Props) {
  const [technicians, setTechnicians] = useState<Technician[]>(initial)
  const [activeTab, setActiveTab] = useState<Tab>("pending")
  const [processing, setProcessing] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(initial[0]?.id ?? "")
  const [draftState, setDraftState] = useState<{ technicianId: string | null; value: TechnicianOverrideDraft | null }>({
    technicianId: initial[0]?.id ?? null,
    value: initial[0] ? buildDraft(initial[0]) : null,
  })
  const [moderationReason, setModerationReason] = useState("")

  const grouped: Record<Tab, Technician[]> = useMemo(
    () => ({
      pending: technicians.filter((technician) => (technician.applicationStatus ?? "pending") === "pending"),
      approved: technicians.filter((technician) => technician.isApproved),
      rejected: technicians.filter((technician) =>
        ["request_changes", "rejected"].includes(technician.applicationStatus ?? "rejected"),
      ),
    }),
    [technicians],
  )

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Pendientes", count: grouped.pending.length },
    { id: "approved", label: "Aprobados", count: grouped.approved.length },
    { id: "rejected", label: "Rechazados", count: grouped.rejected.length },
  ]

  const filtered = useMemo(() => {
    return grouped[activeTab].filter((technician) => {
      const haystack = [
        technician.displayName,
        technician.bio,
        technician.location,
        technician.phone,
        technician.whatsappNumber,
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(query.toLowerCase())
    })
  }, [activeTab, grouped, query])

  const selectedTechnician = filtered.find((technician) => technician.id === selectedId) ?? filtered[0] ?? null
  const draft =
    selectedTechnician && draftState.technicianId === selectedTechnician.id
      ? draftState.value
      : selectedTechnician
        ? buildDraft(selectedTechnician)
        : null

  function selectTechnician(technician: Technician) {
    setSelectedId(technician.id)
    setDraftState({ technicianId: technician.id, value: buildDraft(technician) })
    setModerationReason(technician.moderationReason ?? "")
  }

  function updateDraft(patch: Partial<TechnicianOverrideDraft>) {
    if (!selectedTechnician || !draft) return
    setDraftState({
      technicianId: selectedTechnician.id,
      value: { ...draft, ...patch },
    })
  }

  async function handleAction(techId: string, action: ModerationAction) {
    setProcessing(techId)
    try {
      const response = await fetch(`/api/admin/technicians/${techId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: moderationReason.trim() || undefined }),
      })
      const data = (await response.json()) as {
        error?: string
        data?: { applicationStatus?: Technician["applicationStatus"]; moderationReason?: string | null }
      }
      if (!response.ok) {
        toast.error(data.error ?? "Error al procesar la acción.")
        return
      }

      toast.success(
        action === "approve"
          ? "Técnico aprobado."
          : action === "request_changes"
            ? "Se pidió al técnico que ajuste su perfil."
            : "Técnico rechazado.",
      )
      if (action === "approve") {
        trackAnalyticsEvent("technician_approved", {
          technician_id: techId,
        })
      }
      setTechnicians((current) =>
        current.map((technician) =>
          technician.id === techId
            ? {
                ...technician,
                isApproved: action === "approve",
                isActive: action !== "reject",
                applicationStatus:
                  data.data?.applicationStatus ??
                  (action === "approve" ? "approved" : action === "request_changes" ? "request_changes" : "rejected"),
                moderationReason:
                  data.data?.moderationReason ?? (action === "approve" ? null : moderationReason.trim() || null),
              }
            : technician,
        ),
      )
      if (selectedTechnician?.id === techId) {
        setModerationReason(action === "approve" ? "" : moderationReason)
      }
    } finally {
      setProcessing(null)
    }
  }

  async function saveOverride() {
    if (!selectedTechnician || !draft) return

    setProcessing(selectedTechnician.id)
    try {
      const response = await fetch(`/api/admin/technicians/${selectedTechnician.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", ...draft }),
      })
      const json = (await response.json()) as { error?: string; data?: Technician }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos guardar los cambios del técnico.")
        return
      }

      setTechnicians((current) =>
        current.map((technician) => (technician.id === selectedTechnician.id ? json.data! : technician)),
      )
      setSelectedId(json.data.id)
      setDraftState({ technicianId: json.data.id, value: buildDraft(json.data) })
      toast.success("Perfil técnico actualizado desde el panel admin.")
    } finally {
      setProcessing(null)
    }
  }

  function toggleSelection(field: "services" | "supportedBrands", value: string) {
    if (!draft) return
    const current = draft[field]
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    updateDraft({ [field]: next } as Partial<TechnicianOverrideDraft>)
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Gestión de técnicos</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Aprobá, rechazá y corregí perfiles técnicos sin salir del panel admin.
        </p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-[#f3f4f6] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.id ? "bg-white text-[#111827] shadow-sm" : "text-[#6b7280] hover:text-[#111827]"
            }`}
          >
            {tab.label}
            {tab.count > 0 ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab === tab.id
                    ? tab.id === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-[#d1fae5] text-[#059669]"
                    : "bg-[#e5e7eb] text-[#6b7280]"
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.95fr)]">
        <div className="space-y-4">
          <div className="relative rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-10"
              placeholder="Buscar por nombre, bio, ubicación o contacto"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white py-16 text-center">
              <Wrench className="mb-4 h-10 w-10 text-[#d1d5db]" />
              <p className="text-sm text-[#9ca3af]">No hay técnicos en esta categoría.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((technician) => {
                const isBusy = processing === technician.id
                const isSelected = selectedTechnician?.id === technician.id
                return (
                  <div
                    key={technician.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm transition-colors ${
                      isSelected ? "border-blue-200" : "border-[#e5e7eb]"
                    }`}
                  >
                    <button type="button" className="w-full cursor-pointer text-left" onClick={() => selectTechnician(technician)}>
                      <div className="mb-3 flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d1fae5] text-lg font-bold text-[#059669]">
                          {technician.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#111827]">{technician.displayName}</p>
                            {technician.isApproved ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#d1fae5] px-2 py-0.5 text-xs font-medium text-[#059669]">
                                <CheckCircle className="h-3 w-3" /> Aprobado
                              </span>
                            ) : (technician.applicationStatus ?? "pending") === "request_changes" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                <Clock className="h-3 w-3" /> Pide cambios
                              </span>
                            ) : technician.isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                <Clock className="h-3 w-3" /> Pendiente
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                                <XCircle className="h-3 w-3" /> Rechazado
                              </span>
                            )}
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
                        {technician.phone ? <span>{technician.phone}</span> : null}
                        {technician.reviewCount > 0 ? (
                          <span className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />
                            {technician.rating.toFixed(1)} ({technician.reviewCount})
                          </span>
                        ) : null}
                      </div>
                    </button>

                    <div className="flex flex-wrap gap-2 border-t border-[#f3f4f6] pt-4">
                      {!technician.isApproved ? (
                        <Button size="sm" disabled={isBusy} onClick={() => void handleAction(technician.id, "approve")}>
                          <CheckCircle className="mr-1.5 h-4 w-4" /> Aprobar
                        </Button>
                      ) : null}
                      {!technician.isApproved ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleAction(technician.id, "request_changes")}
                          className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          <Clock className="mr-1.5 h-4 w-4" /> Pedir cambios
                        </Button>
                      ) : null}
                      {technician.isApproved || technician.isActive || technician.applicationStatus === "request_changes" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleAction(technician.id, "reject")}
                          className="border-red-200 text-red-500 hover:bg-red-50"
                        >
                          <XCircle className="mr-1.5 h-4 w-4" /> {technician.isApproved ? "Revocar aprobación" : "Rechazar"}
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" asChild className="ml-auto text-[#6b7280]">
                        <Link href={`/technicians/${technician.id}`} target="_blank">
                          <ExternalLink className="mr-1.5 h-4 w-4" /> Ver perfil
                        </Link>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          {selectedTechnician && draft ? (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold text-[#111827]">Override de perfil</h2>
                <p className="mt-1 text-sm text-[#6b7280]">
                  Ajustá datos públicos, compatibilidad y estado operativo del técnico seleccionado.
                </p>
              </div>

                <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm text-[#374151] sm:col-span-2">
                  <span className="font-medium">Nombre público</span>
                  <Input value={draft.displayName} onChange={(event) => updateDraft({ displayName: event.target.value })} />
                </label>
                <label className="space-y-1 text-sm text-[#374151] sm:col-span-2">
                  <span className="font-medium">URL de foto</span>
                  <Input value={draft.photoURL} onChange={(event) => updateDraft({ photoURL: event.target.value })} />
                </label>
                <label className="space-y-1 text-sm text-[#374151]">
                  <span className="font-medium">Teléfono</span>
                  <Input value={draft.phone} onChange={(event) => updateDraft({ phone: event.target.value })} />
                </label>
                <label className="space-y-1 text-sm text-[#374151]">
                  <span className="font-medium">WhatsApp</span>
                  <Input value={draft.whatsappNumber} onChange={(event) => updateDraft({ whatsappNumber: event.target.value })} />
                </label>
                <label className="space-y-1 text-sm text-[#374151] sm:col-span-2">
                  <span className="font-medium">Ubicación</span>
                  <Input value={draft.location} onChange={(event) => updateDraft({ location: event.target.value })} />
                </label>
                <label className="space-y-1 text-sm text-[#374151] sm:col-span-2">
                  <span className="font-medium">Bio</span>
                  <textarea
                    value={draft.bio}
                    onChange={(event) => updateDraft({ bio: event.target.value })}
                    className="min-h-28 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none ring-0 transition focus:border-[#111827]"
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm text-[#374151]">
                <span className="font-medium">Nota de moderación</span>
                <textarea
                  value={moderationReason}
                  onChange={(event) => setModerationReason(event.target.value)}
                  placeholder="Opcional: explica qué debe corregir el técnico o por qué se rechaza."
                  className="min-h-24 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm text-[#111827] outline-none ring-0 transition focus:border-[#111827]"
                />
              </label>
              {selectedTechnician.moderationReason ? (
                <p className="rounded-xl bg-[#f8fafc] px-4 py-3 text-sm text-[#475569]">
                  Última nota enviada: {selectedTechnician.moderationReason}
                </p>
              ) : null}

              <div className="space-y-2">
                <p className="text-sm font-medium text-[#374151]">Servicios visibles</p>
                <div className="flex flex-wrap gap-2">
                  {services.map((service) => {
                    const selected = draft.services.includes(service.id)
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleSelection("services", service.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          selected ? "bg-[#111827] text-white" : "bg-[#f3f4f6] text-[#6b7280]"
                        }`}
                      >
                        {service.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-[#374151]">Marcas soportadas</p>
                <div className="flex flex-wrap gap-2">
                  {brands.map((brand) => {
                    const selected = draft.supportedBrands.includes(brand.id)
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => toggleSelection("supportedBrands", brand.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          selected ? "bg-emerald-600 text-white" : "bg-[#f3f4f6] text-[#6b7280]"
                        }`}
                      >
                        {brand.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl bg-[#f8fafc] px-4 py-3 text-sm text-[#374151]">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) => updateDraft({ isActive: event.target.checked })}
                  className="h-4 w-4 rounded border-[#cbd5e1]"
                />
                Mantener perfil activo para contacto y operaciones
              </label>

              <Button onClick={() => void saveOverride()} disabled={processing === selectedTechnician.id} className="w-full">
                <Save className="mr-2 h-4 w-4" /> Guardar override admin
              </Button>
            </div>
          ) : (
            <div className="flex min-h-[320px] items-center justify-center text-sm text-[#6b7280]">
              Seleccioná un técnico para editar su perfil.
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
