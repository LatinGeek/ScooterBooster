"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { User, LogOut, Trash2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

const PHONE_REGEX = /^\+598\d{8}$/

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    if (user) {
      // Profile page is a phase-03 scaffold; initialize form state from auth snapshot.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFullName(user.displayName)

      setPhone(user.phone ?? "")
    }
  }, [user])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#10b981] border-t-transparent" />
      </main>
    )
  }

  if (!user) {
    router.replace("/login")
    return null
  }

  const validate = () => {
    const newErrors: typeof errors = {}
    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = "El nombre debe tener al menos 2 caracteres."
    }
    if (phone && !PHONE_REGEX.test(phone)) {
      newErrors.phone = "El teléfono debe tener formato +598XXXXXXXX"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
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
          displayName: fullName.trim(),
          phone: phone || null,
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

  const handleSignOut = async () => {
    await signOut()
    router.replace("/")
  }

  const handleDeleteAccount = async () => {
    // Soft delete: set deletedAt via API
    try {
      await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deletedAt: new Date().toISOString() }),
      })
      await signOut()
      router.replace("/")
    } catch {
      setApiError("No se pudo eliminar la cuenta. Contactá soporte.")
    } finally {
      setShowDeleteDialog(false)
    }
  }

  // Avatar initials
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()

  return (
    <main className="min-h-screen bg-[#f9fafb] px-4 py-10">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-8 text-2xl font-bold text-[#111827]">Mi perfil</h1>

        {/* Avatar */}
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#10b981] text-xl font-bold text-white">
            {initials || <User className="h-8 w-8" />}
          </div>
          <div>
            <p className="font-semibold text-[#111827]">{user.displayName || "Sin nombre"}</p>
            <p className="text-sm text-[#6b7280]">{user.email}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e5e7eb] bg-white px-8 py-8 shadow-sm">
          {apiError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {apiError}
            </div>
          )}
          {saved && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              ¡Perfil actualizado correctamente!
            </div>
          )}

          <form onSubmit={handleSave} noValidate className="flex flex-col gap-5">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fullName" className="text-sm font-medium text-[#374151]">
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Juan García"
                autoComplete="name"
                className={[
                  "rounded-lg border px-4 py-3 text-sm text-[#111827] placeholder:text-[#9ca3af]",
                  "transition-colors duration-200 focus:ring-2 focus:ring-offset-0 focus:outline-none",
                  errors.fullName
                    ? "border-red-500 focus:ring-red-500"
                    : "border-[#e5e7eb] focus:border-[#10b981] focus:ring-[#10b981]",
                ].join(" ")}
              />
              {errors.fullName && <p className="text-xs text-red-600">{errors.fullName}</p>}
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-medium text-[#374151]">
                Teléfono
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
                  "transition-colors duration-200 focus:ring-2 focus:ring-offset-0 focus:outline-none",
                  errors.phone
                    ? "border-red-500 focus:ring-red-500"
                    : "border-[#e5e7eb] focus:border-[#10b981] focus:ring-[#10b981]",
                ].join(" ")}
              />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
            </div>

            {/* Email (read-only from Google) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#374151]">
                Email <span className="text-[#9ca3af]">(no editable)</span>
              </label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="cursor-not-allowed rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3 text-sm text-[#6b7280]"
              />
            </div>

            <Button type="submit" disabled={saving} className="mt-2 w-full">
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="mt-6 rounded-2xl border border-[#e5e7eb] bg-white px-8 py-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold tracking-wide text-[#6b7280] uppercase">
            Cuenta
          </h2>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleSignOut}
              className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#374151] transition-colors duration-150 hover:text-[#10b981]"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="flex cursor-pointer items-center gap-2 text-sm font-medium text-red-500 transition-colors duration-150 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar cuenta
            </button>
          </div>
        </div>
      </div>

      {/* Delete account confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar cuenta?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#6b7280]">
            Esta acción desactivará tu cuenta. Tus datos serán conservados por 30 días antes de
            eliminarse permanentemente. Podés contactar soporte para reactivarla.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
