"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, PauseCircle, Trash2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Technician } from "@/types"

interface Props {
  technician: Technician
  onSave: (payload: {
    displayName: string
    bio: string
    photoURL: string
    phone: string
    whatsappNumber: string
    location: string
    isActive: boolean
  }) => Promise<void>
  onModerate: (action: "approve" | "request_changes" | "reject", reason?: string) => Promise<void>
  onDelete: (hard: boolean) => Promise<void>
  saving?: boolean
}

export function ProfileTab({ technician, onSave, onModerate, onDelete, saving = false }: Props) {
  const [form, setForm] = useState({
    displayName: technician.displayName,
    bio: technician.bio,
    photoURL: technician.photoURL,
    phone: technician.phone,
    whatsappNumber: technician.whatsappNumber,
    location: technician.location,
    isActive: technician.isActive,
  })
  const [moderationReason, setModerationReason] = useState(technician.moderationReason ?? "")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [dangerOpen, setDangerOpen] = useState(false)

  useEffect(() => {
    setForm({
      displayName: technician.displayName,
      bio: technician.bio,
      photoURL: technician.photoURL,
      phone: technician.phone,
      whatsappNumber: technician.whatsappNumber,
      location: technician.location,
      isActive: technician.isActive,
    })
    setModerationReason(technician.moderationReason ?? "")
  }, [technician])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                  technician.isApproved ? "bg-[#d1fae5] text-[#059669]" : "bg-amber-50 text-amber-700"
                }`}
              >
                {technician.isApproved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <PauseCircle className="h-3.5 w-3.5" />}
                {technician.isApproved ? "Aprobado" : "Pendiente de revisión"}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  form.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {form.isActive ? "Perfil activo" : "Perfil pausado"}
              </span>
            </div>
            <p className="text-sm text-[#6b7280]">
              Editá la identidad pública y decidí el estado operativo sin mezclarlo con precios u horarios.
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-sm text-[#374151]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
              className="h-4 w-4 rounded border-[#cbd5e1]"
            />
            Mantener perfil activo
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium text-[#374151]">Nombre público</span>
          <Input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-[#374151]">URL de foto</span>
            <span className="text-xs text-[#9ca3af]">{form.photoURL.trim() ? "Configurada" : "Opcional"}</span>
          </div>
          <Input
            value={form.photoURL}
            onChange={(event) => setForm((current) => ({ ...current, photoURL: event.target.value }))}
            placeholder="https://..."
            className={form.photoURL.trim() ? "" : "text-[#9ca3af]"}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-[#374151]">Teléfono</span>
          <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-[#374151]">WhatsApp</span>
          <Input value={form.whatsappNumber} onChange={(event) => setForm((current) => ({ ...current, whatsappNumber: event.target.value }))} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium text-[#374151]">Ubicación</span>
          <Input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium text-[#374151]">Bio</span>
          <Textarea
            value={form.bio}
            onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
            className="min-h-28"
          />
        </label>
      </div>

      <div className="space-y-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-[#374151]">Nota de moderación</span>
          <Textarea
            value={moderationReason}
            onChange={(event) => setModerationReason(event.target.value)}
            placeholder="Opcional"
            className="min-h-24"
          />
        </label>

        {technician.moderationReason ? (
          <p className="rounded-xl bg-[#f8fafc] px-4 py-3 text-sm text-[#475569]">
            Última nota enviada: {technician.moderationReason}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#059669]" />
          <h3 className="text-sm font-semibold text-[#111827]">Moderación y guardado</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {!technician.isApproved ? (
            <Button type="button" disabled={saving} onClick={() => void onModerate("approve", moderationReason.trim() || undefined)}>
              Aprobar
            </Button>
          ) : null}
          {!technician.isApproved ? (
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => void onModerate("request_changes", moderationReason.trim() || undefined)}
            >
              Pedir cambios
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => void onModerate("reject", moderationReason.trim() || undefined)}
          >
            <XCircle className="h-4 w-4" />
            Rechazar
          </Button>
          <Button type="button" disabled={saving} onClick={() => void onSave(form)} className="ml-auto">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar perfil"
            )}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-red-200 bg-white">
        <button
          type="button"
          onClick={() => setDangerOpen((current) => !current)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-semibold text-red-700">Danger zone</span>
          </div>
          <span className="text-xs text-red-500">{dangerOpen ? "Ocultar" : "Mostrar"}</span>
        </button>
        {dangerOpen ? (
          <div className="border-t border-red-100 bg-red-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-red-800">Eliminar técnico</p>
                <p className="text-sm text-red-700">
                  Se desactiva su cuenta. El borrado total solo está disponible sin reservas.
                </p>
              </div>
              <Button type="button" variant="outline" className="border-red-200 text-red-600 hover:bg-red-100" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar a {technician.displayName}</DialogTitle>
            <DialogDescription>
              Esta acción desactiva su cuenta. Podés elegir borrado suave o total.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-100"
              onClick={() => {
                setDeleteOpen(false)
                void onDelete(false)
              }}
            >
              Desactivar
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => {
                setDeleteOpen(false)
                void onDelete(true)
              }}
            >
              Borrado total
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
