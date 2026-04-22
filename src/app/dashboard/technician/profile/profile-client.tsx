"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import {
  CheckCircle,
  ImageUp,
  Loader2,
  MapPin,
  MessageCircle,
  UploadCloud,
  UserCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Technician } from "@/types"

const PHONE_REGEX = /^\+598\d{8}$/
const WHATSAPP_REGEX = /^598\d{8}$/
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

interface Props {
  tech: Technician
}

interface FormErrors {
  displayName?: string
  bio?: string
  phone?: string
  whatsappNumber?: string
  location?: string
  photoURL?: string
}

export function TechnicianProfileClient({ tech }: Props) {
  const [displayName, setDisplayName] = useState(tech.displayName)
  const [bio, setBio] = useState(tech.bio)
  const [phone, setPhone] = useState(tech.phone)
  const [whatsappNumber, setWhatsappNumber] = useState(tech.whatsappNumber)
  const [location, setLocation] = useState(tech.location)
  const [photoURL, setPhotoURL] = useState(tech.photoURL)
  const [isActive, setIsActive] = useState(tech.isActive)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const previewImage = useMemo(() => photoURL.trim(), [photoURL])
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((value) => value[0] ?? "")
    .join("")
    .toUpperCase()

  function validate() {
    const nextErrors: FormErrors = {}

    if (displayName.trim().length < 2) {
      nextErrors.displayName = "El nombre visible debe tener al menos 2 caracteres."
    }
    if (bio.trim().length < 40) {
      nextErrors.bio = "Contale a los clientes un poco mas sobre tu experiencia."
    }
    if (bio.trim().length > 500) {
      nextErrors.bio = "La bio no puede superar los 500 caracteres."
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      nextErrors.phone = "Usa el formato +598XXXXXXXX."
    }
    if (!WHATSAPP_REGEX.test(whatsappNumber.trim())) {
      nextErrors.whatsappNumber = "Usa el formato 598XXXXXXXX (sin +)."
    }
    if (location.trim().length < 3) {
      nextErrors.location = "Indicá tu zona de trabajo."
    }
    if (photoURL.trim()) {
      try {
        new URL(photoURL.trim())
      } catch {
        nextErrors.photoURL = "La foto debe ser una URL valida o una imagen subida desde tu equipo."
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    if (!validate()) return

    setSaving(true)
    setSaved(false)
    setApiError(null)

    try {
      const response = await fetch("/api/technicians/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim(),
          phone: phone.trim(),
          whatsappNumber: whatsappNumber.trim(),
          location: location.trim(),
          photoURL: photoURL.trim(),
          isActive,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string }
        setApiError(payload.error ?? "No pudimos guardar tu perfil ahora mismo.")
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setApiError("Hubo un problema de conexion. Intenta de nuevo en unos segundos.")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setApiError("Subi una imagen valida en formato JPG, PNG o WebP.")
      event.target.value = ""
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setApiError("La foto no puede superar los 3 MB.")
      event.target.value = ""
      return
    }

    setUploading(true)
    setApiError(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/technicians/me/photo", {
        method: "POST",
        body: formData,
      })
      const payload = (await response.json()) as {
        error?: string
        data?: { photoURL?: string }
      }

      if (!response.ok || !payload.data?.photoURL) {
        setApiError(payload.error ?? "No pudimos procesar la imagen en este momento.")
        return
      }

      setPhotoURL(payload.data.photoURL)
      setErrors((current) => ({ ...current, photoURL: undefined }))
    } catch {
      setApiError(
        "No pudimos subir la imagen al storage. Si sigue fallando, pega una URL publica por ahora.",
      )
    } finally {
      setUploading(false)
      event.target.value = ""
    }
  }

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Perfil profesional</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#6b7280]">
            Ajusta la informacion que ven los clientes en tu ficha publica. Los servicios y la
            disponibilidad se gestionan por separado para que este perfil quede bien enfocado.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/technicians/${tech.id}`}>Ver ficha publica</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/technician/services">Editar servicios</Link>
          </Button>
        </div>
      </div>

      {apiError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      )}

      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#a7f3d0] bg-[#d1fae5] px-4 py-3 text-sm text-[#065f46]">
          <CheckCircle className="h-4 w-4" />
          Perfil tecnico guardado correctamente.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={handleSave}
          noValidate
          className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Nombre visible
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                error={Boolean(errors.displayName)}
                placeholder="Ej: Carlos Rodriguez"
                autoComplete="name"
              />
              {errors.displayName && <p className="mt-1 text-xs text-red-600">{errors.displayName}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Presentacion profesional
              </label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                error={Boolean(errors.bio)}
                rows={6}
                placeholder="Conta tu experiencia, especialidades, barrios que cubris y el tipo de scooter con el que trabajas mejor."
              />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className={errors.bio ? "text-red-600" : "text-[#9ca3af]"}>
                  {errors.bio ?? "Minimo 40 caracteres. Mantene el texto claro y concreto."}
                </span>
                <span className="text-[#9ca3af]">{bio.trim().length}/500</span>
              </div>
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Telefono de contacto
              </label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                error={Boolean(errors.phone)}
                autoComplete="tel"
                placeholder="+59899123456"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
            </div>

            <div>
              <label
                htmlFor="whatsappNumber"
                className="mb-1.5 block text-sm font-medium text-[#374151]"
              >
                WhatsApp para clientes
              </label>
              <Input
                id="whatsappNumber"
                type="tel"
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                error={Boolean(errors.whatsappNumber)}
                placeholder="59899123456"
              />
              {errors.whatsappNumber && (
                <p className="mt-1 text-xs text-red-600">{errors.whatsappNumber}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Zona de trabajo
              </label>
              <Input
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                error={Boolean(errors.location)}
                placeholder="Ej: Pocitos, Montevideo"
              />
              {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
            </div>

            <div className="md:col-span-2">
              <label htmlFor="photoURL" className="mb-1.5 block text-sm font-medium text-[#374151]">
                Foto del perfil
              </label>
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[#d1d5db] bg-[#fafafa] p-4">
                <div className="flex flex-wrap gap-3">
                  <Input
                    id="photoURL"
                    value={photoURL}
                    onChange={(event) => setPhotoURL(event.target.value)}
                    error={Boolean(errors.photoURL)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="mr-2 h-4 w-4" />
                        Subir imagen
                      </>
                    )}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => void handleUpload(event)}
                />
                <p className="text-xs text-[#6b7280]">
                  Puedes pegar una URL publica o subir una imagen de hasta 2 MB. Si la subes desde
                  tu equipo, la ajustamos automaticamente a 512 px para que cargue mas rapido.
                </p>
                {errors.photoURL && <p className="text-xs text-red-600">{errors.photoURL}</p>}
              </div>
            </div>

            <div className="md:col-span-2 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-[#111827]">Perfil activo</p>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    Cuando esta activo apareces en el catalogo y puedes recibir nuevas reservas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive((current) => !current)}
                  className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200 ${
                    isActive ? "bg-[#10b981]" : "bg-[#d1d5db]"
                  }`}
                  aria-pressed={isActive}
                  aria-label={isActive ? "Pausar perfil" : "Activar perfil"}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={saving || uploading}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar perfil"
              )}
            </Button>
            <p className="text-sm text-[#6b7280]">
              Tus precios y marcas atendidas siguen en{" "}
              <Link href="/dashboard/technician/services" className="font-medium text-[#059669] hover:underline">
                Servicios
              </Link>
              .
            </p>
          </div>
        </form>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-[#111827]">Vista previa publica</p>
            <div className="rounded-2xl border border-[#f3f4f6] bg-[#fafafa] p-5">
              <div className="flex items-center gap-4">
                {previewImage ? (
                  <Image
                    src={previewImage}
                    alt={displayName}
                    width={80}
                    height={80}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#d1fae5] text-2xl font-bold text-[#059669]">
                    {initials || <UserCircle className="h-8 w-8" />}
                  </div>
                )}

                <div>
                  <p className="font-semibold text-[#111827]">{displayName || tech.displayName}</p>
                  <p className="text-sm text-[#6b7280]">{location || tech.location}</p>
                  <span
                    className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      isActive ? "bg-[#d1fae5] text-[#065f46]" : "bg-[#fee2e2] text-[#991b1b]"
                    }`}
                  >
                    {isActive ? "Visible en catalogo" : "Perfil en pausa"}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm text-[#374151]">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-[#9ca3af]" />
                  <span>{whatsappNumber || "WhatsApp pendiente"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#9ca3af]" />
                  <span>{location || tech.location}</span>
                </div>
                <p className="line-clamp-5 text-[#6b7280]">{bio || tech.bio}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#6b7280]">
              Siguiente ajuste recomendado
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-[#374151]">
              <li className="flex items-start gap-2">
                <ImageUp className="mt-0.5 h-4 w-4 text-[#10b981]" />
                Usa una foto nitida y bien iluminada para subir la confianza en la ficha publica.
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-4 w-4 text-[#10b981]" />
                Revisa tus servicios y precios si cambiaste de enfoque o zona de trabajo.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </section>
  )
}
