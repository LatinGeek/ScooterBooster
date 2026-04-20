"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PlusCircle, Save, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Service } from "@/types"

interface Props {
  services: Service[]
}

interface ServiceDraft {
  name: string
  description: string
  category: Service["category"]
  estimatedDuration: string
  requiresDisclaimer: boolean
  isActive: boolean
}

const SERVICE_CATEGORIES: Array<{ value: Service["category"]; label: string }> = [
  { value: "maintenance", label: "Mantenimiento" },
  { value: "firmware", label: "Firmware" },
  { value: "cruise-control", label: "Control de crucero" },
  { value: "speed-limit", label: "Deslimitación" },
]

export function AdminServicesClient({ services: initialServices }: Props) {
  const [services, setServices] = useState(initialServices)
  const [saving, setSaving] = useState<string | null>(null)
  const [newService, setNewService] = useState<ServiceDraft>({
    name: "",
    description: "",
    category: "maintenance",
    estimatedDuration: "60",
    requiresDisclaimer: false,
    isActive: true,
  })

  async function saveService(payload: ServiceDraft & { id?: string }) {
    const isCreate = !payload.id
    setSaving(payload.id ?? "new")
    try {
      const response = await fetch("/api/admin/catalog/services", {
        method: isCreate ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          estimatedDuration: Number(payload.estimatedDuration),
        }),
      })

      const json = (await response.json()) as { error?: string; data?: Service }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos guardar el servicio.")
        return
      }

      setServices((current) =>
        isCreate
          ? [...current, json.data!].sort((a, b) => a.name.localeCompare(b.name, "es"))
          : current.map((service) => (service.id === json.data!.id ? json.data! : service)),
      )

      if (isCreate) {
        setNewService({
          name: "",
          description: "",
          category: "maintenance",
          estimatedDuration: "60",
          requiresDisclaimer: false,
          isActive: true,
        })
      }

      toast.success(isCreate ? "Servicio creado." : "Servicio actualizado.")
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Servicios</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Gestioná la oferta del catálogo, la duración estimada y si cada servicio requiere aviso legal.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
          <Wrench className="h-5 w-5 text-[#2563eb]" />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#111827]">Nuevo servicio</h2>
          <PlusCircle className="h-4 w-4 text-[#10b981]" />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Input value={newService.name} onChange={(event) => setNewService((current) => ({ ...current, name: event.target.value }))} placeholder="Nombre del servicio" />
          <select
            value={newService.category}
            onChange={(event) =>
              setNewService((current) => ({ ...current, category: event.target.value as Service["category"] }))
            }
            className="h-11 rounded-lg border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827]"
          >
            {SERVICE_CATEGORIES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Textarea
            value={newService.description}
            onChange={(event) => setNewService((current) => ({ ...current, description: event.target.value }))}
            placeholder="Descripción pública del servicio"
            className="md:col-span-2"
          />
          <Input
            value={newService.estimatedDuration}
            onChange={(event) => setNewService((current) => ({ ...current, estimatedDuration: event.target.value }))}
            placeholder="Duración estimada (min)"
          />
          <div className="flex items-center gap-6 text-sm text-[#374151]">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newService.requiresDisclaimer}
                onChange={(event) =>
                  setNewService((current) => ({ ...current, requiresDisclaimer: event.target.checked }))
                }
              />
              Requiere aviso legal
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newService.isActive}
                onChange={(event) => setNewService((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Activo
            </label>
          </div>
        </div>

        <Button
          onClick={() => void saveService(newService)}
          disabled={saving === "new" || newService.name.trim().length < 2 || newService.description.trim().length < 20}
        >
          <Save className="h-4 w-4" />
          Crear servicio
        </Button>

        <div className="space-y-3 pt-2">
          {services.map((service) => (
            <ServiceRow key={service.id} service={service} saving={saving === service.id} onSave={saveService} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ServiceRow({
  service,
  saving,
  onSave,
}: {
  service: Service
  saving: boolean
  onSave: (payload: ServiceDraft & { id?: string }) => Promise<void>
}) {
  const [draft, setDraft] = useState<ServiceDraft>({
    name: service.name,
    description: service.description,
    category: service.category,
    estimatedDuration: String(service.estimatedDuration),
    requiresDisclaimer: service.requiresDisclaimer,
    isActive: service.isActive,
  })

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-[#fafafa] p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        <select
          value={draft.category}
          onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as Service["category"] }))}
          className="h-11 rounded-lg border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827]"
        >
          {SERVICE_CATEGORIES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Textarea
          value={draft.description}
          onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
          className="md:col-span-2"
        />
        <Input
          value={draft.estimatedDuration}
          onChange={(event) => setDraft((current) => ({ ...current, estimatedDuration: event.target.value }))}
          placeholder="Duración estimada"
        />
        <div className="flex items-center gap-6 text-sm text-[#374151]">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.requiresDisclaimer}
              onChange={(event) =>
                setDraft((current) => ({ ...current, requiresDisclaimer: event.target.checked }))
              }
            />
            Requiere aviso legal
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Activo
          </label>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={() => void onSave({ id: service.id, ...draft })} disabled={saving}>
          Guardar servicio
        </Button>
      </div>
    </div>
  )
}
