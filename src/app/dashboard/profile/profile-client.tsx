"use client"

import Image from "next/image"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { UserCircle, Trash2, MessageCircle, CheckCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { User } from "@/types"

const PHONE_REGEX = /^\+598\d{8}$/

interface Props {
  user: User
}

export function ProfileClient({ user }: Props) {
  const { signOut } = useAuth()
  const router = useRouter()

  const [displayName, setDisplayName] = useState(user.displayName)
  const [phone, setPhone] = useState(user.phone ?? "")
  const [whatsappConsent, setWhatsappConsent] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<{ displayName?: string; phone?: string }>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!displayName.trim() || displayName.trim().length < 2) {
      errs.displayName = "El nombre debe tener al menos 2 caracteres."
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      errs.phone = "Formato inválido. Ejemplo: +59899123456"
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setApiError(null)
    setSaved(false)

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          phone: phone.trim() || null,
          whatsappConsent,
        }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setApiError(data.error ?? "Error al guardar. Intentá de nuevo.")
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setApiError("Error de conexión. Intentá de nuevo.")
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setApiError(data.error ?? "No se pudo eliminar la cuenta.")
        setShowDeleteDialog(false)
        return
      }
      await signOut()
      router.replace("/")
    } catch {
      setApiError("Error de conexión. Intentá soporte.")
      setShowDeleteDialog(false)
    } finally {
      setDeleting(false)
    }
  }

  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()

  return (
    <section>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Mi perfil</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Actualizá tus datos de contacto y preferencias.
        </p>
      </div>

      {/* Avatar card */}
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
        {user.photoURL ? (
          <Image
            src={user.photoURL}
            alt={user.displayName}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#d1fae5] text-xl font-bold text-[#059669]">
            {initials || <UserCircle className="h-8 w-8" />}
          </div>
        )}
        <div>
          <p className="font-semibold text-[#111827]">{user.displayName}</p>
          <p className="text-sm text-[#6b7280]">{user.email}</p>
          <p className="mt-1 text-xs text-[#9ca3af]">Cuenta Google · rol usuario</p>
        </div>
      </div>

      {/* Toast */}
      {apiError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      )}
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#a7f3d0] bg-[#d1fae5] px-4 py-3 text-sm text-[#065f46]">
          <CheckCircle className="h-4 w-4" />
          ¡Perfil actualizado correctamente!
        </div>
      )}

      {/* Form */}
      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <form onSubmit={handleSave} noValidate className="flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="displayName" className="text-sm font-medium text-[#374151]">
              Nombre completo
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Juan García"
              autoComplete="name"
              className={[
                "rounded-lg border px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af]",
                "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
                errors.displayName
                  ? "border-red-500 focus:ring-red-500"
                  : "border-[#e5e7eb] focus:border-[#10b981] focus:ring-[#10b981]",
              ].join(" ")}
            />
            {errors.displayName && (
              <p className="text-xs text-red-600">{errors.displayName}</p>
            )}
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-medium text-[#374151]">
              Teléfono{" "}
              <span className="text-[#9ca3af] font-normal">(opcional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+59899123456"
              autoComplete="tel"
              className={[
                "rounded-lg border px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af]",
                "transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0",
                errors.phone
                  ? "border-red-500 focus:ring-red-500"
                  : "border-[#e5e7eb] focus:border-[#10b981] focus:ring-[#10b981]",
              ].join(" ")}
            />
            {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
          </div>

          {/* Email — read-only */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#374151]">
              Email{" "}
              <span className="text-[#9ca3af] font-normal">(no editable — viene de Google)</span>
            </label>
            <input
              type="email"
              value={user.email}
              readOnly
              className="cursor-not-allowed rounded-lg border border-[#e5e7eb] bg-[#f3f4f6] px-4 py-3 text-sm text-[#9ca3af]"
            />
          </div>

          {/* WhatsApp consent */}
          <label className="flex cursor-pointer items-start gap-3">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-5 rounded border border-[#e5e7eb] bg-white transition-colors peer-checked:border-[#10b981] peer-checked:bg-[#10b981]" />
              {whatsappConsent && (
                <MessageCircle className="absolute inset-0 h-5 w-5 p-0.5 text-white" />
              )}
            </div>
            <span className="text-sm text-[#374151]">
              Acepto recibir notificaciones de mis reservas por WhatsApp
            </span>
          </label>

          <Button type="submit" disabled={saving} className="mt-2">
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </form>
      </div>

      {/* Danger zone */}
      <div className="mt-6 rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-red-400">
          Zona de peligro
        </h2>
        <p className="mb-4 text-sm text-[#6b7280]">
          Eliminar tu cuenta desactivará tu acceso y borrará tus datos en 30 días. Esta acción es
          reversible contactando soporte antes del plazo.
        </p>
        <Button
          variant="outline"
          className="border-red-300 text-red-500 hover:bg-red-50 hover:text-red-700"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Eliminar mi cuenta
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar cuenta?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6b7280]">
            Tu cuenta será desactivada y tus datos eliminados en 30 días. Podés reactivarla
            contactando soporte dentro de ese plazo.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting}>
              {deleting ? "Eliminando…" : "Sí, eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
