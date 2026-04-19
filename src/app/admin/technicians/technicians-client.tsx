"use client"

import { useState } from "react"
import { toast } from "sonner"
import Link from "next/link"
import { CheckCircle, XCircle, Clock, ExternalLink, Wrench, Star, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Technician } from "@/types"

interface Props {
  technicians: Technician[]
}

type Tab = "pending" | "approved" | "rejected"

export function AdminTechniciansClient({ technicians: initial }: Props) {
  const [technicians, setTechnicians] = useState<Technician[]>(initial)
  const [activeTab, setActiveTab] = useState<Tab>("pending")
  const [processing, setProcessing] = useState<string | null>(null)

  const grouped: Record<Tab, Technician[]> = {
    pending: technicians.filter((t) => !t.isApproved && t.isActive),
    approved: technicians.filter((t) => t.isApproved),
    rejected: technicians.filter((t) => !t.isApproved && !t.isActive),
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "pending", label: "Pendientes", count: grouped.pending.length },
    { id: "approved", label: "Aprobados", count: grouped.approved.length },
    { id: "rejected", label: "Rechazados", count: grouped.rejected.length },
  ]

  async function handleAction(techId: string, action: "approve" | "reject") {
    setProcessing(techId)
    try {
      const res = await fetch(`/api/admin/technicians/${techId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        toast.error(data.error ?? "Error al procesar la acción.")
        return
      }
      toast.success(action === "approve" ? "Técnico aprobado." : "Técnico rechazado.")
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === techId
            ? {
                ...t,
                isApproved: action === "approve",
                isActive: action === "approve" ? true : false,
              }
            : t,
        ),
      )
    } finally {
      setProcessing(null)
    }
  }

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Gestión de técnicos</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Aprobá o rechazá solicitudes para aparecer en el catálogo.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-[#f3f4f6] p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
              activeTab === tab.id
                ? "bg-white text-[#111827] shadow-sm"
                : "text-[#6b7280] hover:text-[#111827]"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
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
            )}
          </button>
        ))}
      </div>

      {grouped[activeTab].length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white py-16 text-center">
          <Wrench className="mb-4 h-10 w-10 text-[#d1d5db]" />
          <p className="text-sm text-[#9ca3af]">No hay técnicos en esta categoría.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped[activeTab].map((tech) => {
            const isBusy = processing === tech.id
            return (
              <div
                key={tech.id}
                className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#d1fae5] text-lg font-bold text-[#059669]">
                    {tech.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#111827]">{tech.displayName}</p>
                      {tech.isApproved && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#d1fae5] px-2 py-0.5 text-xs font-medium text-[#059669]">
                          <CheckCircle className="h-3 w-3" /> Aprobado
                        </span>
                      )}
                      {!tech.isApproved && !tech.isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                          <XCircle className="h-3 w-3" /> Rechazado
                        </span>
                      )}
                      {!tech.isApproved && tech.isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <Clock className="h-3 w-3" /> Pendiente
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-sm text-[#6b7280]">{tech.bio}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="mb-4 flex flex-wrap gap-3 text-xs text-[#6b7280]">
                  {tech.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {tech.location}
                    </span>
                  )}
                  {tech.phone && <span>{tech.phone}</span>}
                  {tech.reviewCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" />
                      {tech.rating.toFixed(1)} ({tech.reviewCount})
                    </span>
                  )}
                  {tech.services.length > 0 && (
                    <span>
                      Servicios:{" "}
                      {tech.services
                        .map((s) => s.replace("brand-", "").replace("-", " "))
                        .join(", ")}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 border-t border-[#f3f4f6] pt-4">
                  {!tech.isApproved && (
                    <Button
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleAction(tech.id, "approve")}
                    >
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      Aprobar
                    </Button>
                  )}
                  {tech.isApproved && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleAction(tech.id, "reject")}
                      className="border-red-200 text-red-500 hover:bg-red-50"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Revocar aprobación
                    </Button>
                  )}
                  {!tech.isApproved && tech.isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => void handleAction(tech.id, "reject")}
                      className="border-red-200 text-red-500 hover:bg-red-50"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Rechazar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild className="ml-auto text-[#6b7280]">
                    <Link href={`/technicians/${tech.id}`} target="_blank">
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Ver perfil
                    </Link>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
