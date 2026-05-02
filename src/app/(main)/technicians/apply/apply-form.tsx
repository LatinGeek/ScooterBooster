"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheck, Wrench, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackAnalyticsEvent } from "@/lib/analytics"
import type { ScooterBrand, Service, Technician } from "@/types"

interface ApplyFormProps {
  services: Service[]
  brands: ScooterBrand[]
  existingApplication: Technician | null
  userProfile: {
    displayName: string
    phone: string | null
  }
}

export function ApplyForm({
  services,
  brands,
  existingApplication,
  userProfile,
}: ApplyFormProps) {
  const router = useRouter()
  const [bio, setBio] = useState(existingApplication?.bio ?? "")
  const [location, setLocation] = useState(existingApplication?.location ?? "")
  const [whatsappNumber, setWhatsappNumber] = useState(
    existingApplication?.whatsappNumber ?? userProfile.phone?.replace(/^\+/, "") ?? "598",
  )
  const [basePrice, setBasePrice] = useState(
    String(existingApplication?.pricing[existingApplication.services[0] ?? ""]?.basePrice ?? 1500),
  )
  const [selectedServices, setSelectedServices] = useState<string[]>(existingApplication?.services ?? [])
  const [selectedBrands, setSelectedBrands] = useState<string[]>(existingApplication?.supportedBrands ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const status = useMemo(() => {
    if (!existingApplication) return null
    return (
      existingApplication.applicationStatus ??
      (existingApplication.isApproved ? "approved" : existingApplication.isActive ? "pending" : "rejected")
    )
  }, [existingApplication])

  function toggleSelection(
    current: string[],
    value: string,
    setter: (next: string[]) => void,
  ) {
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/technicians/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          location,
          whatsappNumber,
          basePrice: Number(basePrice),
          services: selectedServices,
          supportedBrands: selectedBrands,
        }),
      })

      const json = (await response.json()) as { success: boolean; error?: string }

      if (!response.ok || !json.success) {
        setError(json.error ?? "No pudimos enviar tu postulación. Intenta de nuevo.")
        return
      }

      trackAnalyticsEvent("technician_applied", {
        mode: existingApplication ? "resubmission" : "new",
        services: selectedServices.length,
        brands: selectedBrands.length,
      })
      router.replace("/technicians/apply?submitted=1")
      router.refresh()
    } catch {
      setError("Error de conexión. Revisa tu internet e intenta otra vez.")
    } finally {
      setSubmitting(false)
    }
  }

  if (status === "approved") {
    return (
      <div className="rounded-3xl border border-[#d1fae5] bg-[#ecfdf5] p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10b981] text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#065f46]">Ya sos técnico aprobado</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#047857]">
              Tu perfil ya esta activo en el catalogo. Desde el dashboard podes editar servicios,
              disponibilidad y gestionar reservas.
            </p>
            <Button asChild className="mt-5">
              <a href="/dashboard/technician">Ir al dashboard técnico</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (status === "pending") {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <Wrench className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#111827]">Tu postulación ya fue enviada</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">
              Estamos revisando tu solicitud para aparecer en el catalogo. Mientras tanto, dejamos
              guardados tus servicios, marcas y datos de contacto para que el equipo admin los
              valide.
            </p>
            <div className="mt-5 grid gap-3 rounded-2xl border border-amber-200 bg-white p-4 text-sm text-[#374151]">
              <p>
                <strong>Zona:</strong> {existingApplication?.location}
              </p>
              <p>
                <strong>Servicios:</strong> {existingApplication?.services.length ?? 0}
              </p>
              <p>
                <strong>Marcas:</strong> {existingApplication?.supportedBrands.length ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const needsResubmission = status === "request_changes" || status === "rejected"

  return (
    <div className="space-y-6">
      {needsResubmission ? (
        <div
          className={`rounded-3xl border p-8 shadow-sm ${
            status === "request_changes" ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                status === "request_changes" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
              }`}
            >
              {status === "request_changes" ? <Wrench className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#111827]">
                {status === "request_changes"
                  ? "Tu perfil necesita algunos ajustes"
                  : "Tu solicitud fue rechazada por ahora"}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4b5563]">
                {status === "request_changes"
                  ? "Te dejamos la ultima devolucion del equipo para que actualices el perfil y lo envies otra vez."
                  : "Puedes corregir los puntos marcados y reenviar la postulacion cuando quieras."}
              </p>
              {existingApplication?.moderationReason ? (
                <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm text-[#374151]">
                  <strong>Comentario del equipo:</strong> {existingApplication.moderationReason}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl border border-[#e5e7eb] bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#10b981] uppercase">
              Perfil actual
            </p>
            <h2 className="mt-2 text-xl font-bold text-[#111827]">{userProfile.displayName}</h2>
            <p className="mt-3 text-sm text-[#6b7280]">
              Telefono base: <strong>{userProfile.phone ?? "Completa onboarding primero"}</strong>
            </p>
            <p className="mt-4 text-sm leading-6 text-[#6b7280]">
              Vamos a usar estos datos de usuario como base y sumarle tu especialidad tecnica para
              crear la postulacion inicial.
            </p>
          </div>

          <div className="rounded-2xl border border-[#d1fae5] bg-[#ecfdf5] p-5">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#047857] uppercase">
              Lo que revisa admin
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#065f46]">
              <li>- Experiencia y especialidades claras</li>
              <li>- Zona de trabajo bien definida</li>
              <li>- WhatsApp listo para coordinar</li>
              <li>- Precio base coherente para empezar</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="bio" className="text-sm font-semibold text-[#111827]">
            Contanos tu experiencia
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={5}
            maxLength={500}
            placeholder="Ej: Trabajo con firmware Xiaomi desde 2022, hago mantenimiento preventivo y ajustes de freno en Montevideo..."
            className="mt-2 w-full rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
          />
          <p className="mt-2 text-right text-xs text-[#9ca3af]">{bio.length}/500</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <label htmlFor="location" className="text-sm font-semibold text-[#111827]">
              Zona de trabajo
            </label>
            <input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ej: Pocitos, Montevideo"
              className="mt-2 h-11 w-full rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
            />
          </div>

          <div>
            <label htmlFor="whatsappNumber" className="text-sm font-semibold text-[#111827]">
              WhatsApp
            </label>
            <input
              id="whatsappNumber"
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              placeholder="59899123456"
              className="mt-2 h-11 w-full rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-4 text-sm text-[#111827] outline-none placeholder:text-[#9ca3af]"
            />
          </div>

          <div>
            <label htmlFor="basePrice" className="text-sm font-semibold text-[#111827]">
              Precio base inicial (UYU)
            </label>
            <input
              id="basePrice"
              type="number"
              min={500}
              step={100}
              value={basePrice}
              onChange={(event) => setBasePrice(event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-4 text-sm text-[#111827] outline-none"
            />
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[#111827]">Servicios que ofreces</p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {services.map((service) => (
              <label
                key={service.id}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#e5e7eb] px-4 py-3 transition-colors hover:border-[#10b981] hover:bg-[#f0fdf4]"
              >
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service.id)}
                  onChange={() => toggleSelection(selectedServices, service.id, setSelectedServices)}
                  className="mt-1 h-4 w-4 rounded border-[#d1d5db] text-[#10b981] focus:ring-[#10b981]"
                />
                <span className="text-sm text-[#374151]">{service.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-[#111827]">Marcas con las que trabajas</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {brands.map((brand) => (
              <label
                key={brand.id}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#e5e7eb] px-4 py-3 transition-colors hover:border-[#10b981] hover:bg-[#f0fdf4]"
              >
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand.id)}
                  onChange={() => toggleSelection(selectedBrands, brand.id, setSelectedBrands)}
                  className="h-4 w-4 rounded border-[#d1d5db] text-[#10b981] focus:ring-[#10b981]"
                />
                <span className="text-sm text-[#374151]">{brand.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#f3f4f6] pt-6">
          <p className="max-w-2xl text-sm text-[#6b7280]">
            Al enviar la postulacion vamos a dejar tu perfil tecnico en estado pendiente para que
            admin lo revise y, si corresponde, te habilite en el catalogo.
          </p>
          <Button type="submit" disabled={submitting || !userProfile.phone}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : existingApplication ? (
              "Reenviar postulacion"
            ) : (
              "Enviar postulacion"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
