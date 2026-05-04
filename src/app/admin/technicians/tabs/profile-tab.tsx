"use client"

import { useEffect, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
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
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium text-[#374151]">Nombre público</span>
          <Input value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium text-[#374151]">URL de foto</span>
          <Input value={form.photoURL} onChange={(event) => setForm((current) => ({ ...current, photoURL: event.target.value }))} />
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

      <label className="flex items-center gap-3 rounded-xl bg-[#f8fafc] px-4 py-3 text-sm text-[#374151]">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
          className="h-4 w-4 rounded border-[#cbd5e1]"
        />
        Mantener perfil activo para contacto y operaciones
      </label>

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

      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
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
