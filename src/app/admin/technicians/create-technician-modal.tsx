"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

export function CreateTechnicianModal({ open, onOpenChange, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: "",
    displayName: "",
    bio: "",
    phone: "",
    whatsappNumber: "",
    location: "",
    photoURL: "",
  })

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/technicians", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const payload = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(payload.error ?? "No pudimos crear el técnico.")
        return
      }

      onOpenChange(false)
      onCreated()
      setForm({
        email: "",
        displayName: "",
        bio: "",
        phone: "",
        whatsappNumber: "",
        location: "",
        photoURL: "",
      })
    } catch {
      setError("Error de conexión.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crear técnico</DialogTitle>
          <DialogDescription>
            Creá la cuenta y el perfil base. Después configurá precios y horarios.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium text-[#374151]">Email</span>
            <Input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium text-[#374151]">Nombre completo</span>
            <Input
              value={form.displayName}
              onChange={(event) =>
                setForm((current) => ({ ...current, displayName: event.target.value }))
              }
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[#374151]">Teléfono</span>
            <Input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="+59899123456"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-[#374151]">WhatsApp</span>
            <Input
              value={form.whatsappNumber}
              onChange={(event) =>
                setForm((current) => ({ ...current, whatsappNumber: event.target.value }))
              }
              placeholder="59899123456"
              required
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium text-[#374151]">Ubicación</span>
            <Input
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              required
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium text-[#374151]">Bio</span>
            <Textarea
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              required
              rows={5}
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium text-[#374151]">Foto URL</span>
            <Input
              value={form.photoURL}
              onChange={(event) => setForm((current) => ({ ...current, photoURL: event.target.value }))}
              placeholder="Opcional"
            />
          </label>

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                "Crear técnico"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
