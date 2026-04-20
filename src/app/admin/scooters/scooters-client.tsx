"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Bike, PlusCircle, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ScooterBrand, ScooterModel, Service } from "@/types"

interface Props {
  brands: ScooterBrand[]
  models: ScooterModel[]
  services: Service[]
}

interface BrandDraft {
  name: string
  logoURL: string
  isActive: boolean
}

interface ModelDraft {
  brandId: string
  name: string
  imageURL: string
  maxSpeed: string
  range: string
  battery: string
  motor: string
  weight: string
  compatibleServices: string[]
  isActive: boolean
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d1d5db] bg-white px-4 py-8 text-center text-sm text-[#6b7280]">
      {text}
    </div>
  )
}

export function AdminScootersClient({ brands: initialBrands, models: initialModels, services }: Props) {
  const [brands, setBrands] = useState(initialBrands)
  const [models, setModels] = useState(initialModels)
  const [savingBrand, setSavingBrand] = useState<string | null>(null)
  const [savingModel, setSavingModel] = useState<string | null>(null)

  const [newBrand, setNewBrand] = useState<BrandDraft>({
    name: "",
    logoURL: "",
    isActive: true,
  })

  const [newModel, setNewModel] = useState<ModelDraft>({
    brandId: initialBrands[0]?.id ?? "",
    name: "",
    imageURL: "",
    maxSpeed: "25",
    range: "30",
    battery: "36V 10Ah",
    motor: "350W",
    weight: "14",
    compatibleServices: services.map((service) => service.id),
    isActive: true,
  })

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((brand) => [brand.id, brand.name])),
    [brands],
  )

  async function saveBrand(payload: BrandDraft & { id?: string }) {
    const isCreate = !payload.id
    const endpoint = "/api/admin/catalog/brands"
    setSavingBrand(payload.id ?? "new")
    try {
      const response = await fetch(endpoint, {
        method: isCreate ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          logoURL: payload.logoURL.trim() || null,
        }),
      })

      const json = (await response.json()) as { success?: boolean; error?: string; data?: ScooterBrand }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos guardar la marca.")
        return
      }

      setBrands((current) =>
        isCreate
          ? [...current, json.data!].sort((a, b) => a.name.localeCompare(b.name, "es"))
          : current.map((brand) => (brand.id === json.data!.id ? json.data! : brand)),
      )

      if (isCreate) {
        setNewBrand({ name: "", logoURL: "", isActive: true })
      }

      toast.success(isCreate ? "Marca creada." : "Marca actualizada.")
    } finally {
      setSavingBrand(null)
    }
  }

  async function saveModel(payload: ModelDraft & { id?: string }) {
    const isCreate = !payload.id
    setSavingModel(payload.id ?? "new")
    try {
      const response = await fetch("/api/admin/catalog/models", {
        method: isCreate ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          imageURL: payload.imageURL.trim() || null,
          specs: {
            maxSpeed: Number(payload.maxSpeed),
            range: Number(payload.range),
            battery: payload.battery,
            motor: payload.motor,
            weight: Number(payload.weight),
          },
        }),
      })

      const json = (await response.json()) as { success?: boolean; error?: string; data?: ScooterModel }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos guardar el modelo.")
        return
      }

      setModels((current) =>
        isCreate
          ? [...current, json.data!].sort((a, b) => a.name.localeCompare(b.name, "es"))
          : current.map((model) => (model.id === json.data!.id ? json.data! : model)),
      )

      if (isCreate) {
        setNewModel((current) => ({
          ...current,
          name: "",
          imageURL: "",
        }))
      }

      toast.success(isCreate ? "Modelo creado." : "Modelo actualizado.")
    } finally {
      setSavingModel(null)
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Catálogo de scooters</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Gestioná marcas y modelos, incluyendo especificaciones e imagen pública.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
          <Bike className="h-5 w-5 text-[#2563eb]" />
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-4 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#111827]">Nueva marca</h2>
            <PlusCircle className="h-4 w-4 text-[#10b981]" />
          </div>

          <Input
            value={newBrand.name}
            onChange={(event) => setNewBrand((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ej: Xiaomi"
          />
          <Input
            value={newBrand.logoURL}
            onChange={(event) => setNewBrand((current) => ({ ...current, logoURL: event.target.value }))}
            placeholder="Logo URL (opcional)"
          />

          <label className="flex items-center gap-2 text-sm text-[#374151]">
            <input
              type="checkbox"
              checked={newBrand.isActive}
              onChange={(event) => setNewBrand((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Marca activa
          </label>

          <Button
            onClick={() => void saveBrand(newBrand)}
            disabled={savingBrand === "new" || newBrand.name.trim().length < 2}
          >
            <Save className="h-4 w-4" />
            Crear marca
          </Button>

          <div className="space-y-3 pt-2">
            {brands.length === 0 ? (
              <EmptyMessage text="Todavía no hay marcas cargadas." />
            ) : (
              brands.map((brand) => (
                <BrandRow key={brand.id} brand={brand} onSave={saveBrand} saving={savingBrand === brand.id} />
              ))
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#111827]">Modelos</h2>
            <PlusCircle className="h-4 w-4 text-[#10b981]" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={newModel.brandId}
              onChange={(event) => setNewModel((current) => ({ ...current, brandId: event.target.value }))}
              className="h-11 rounded-lg border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827]"
            >
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <Input
              value={newModel.name}
              onChange={(event) => setNewModel((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ej: Xiaomi Electric Scooter 4 Ultra"
            />
            <Input
              value={newModel.imageURL}
              onChange={(event) => setNewModel((current) => ({ ...current, imageURL: event.target.value }))}
              placeholder="Imagen URL (opcional)"
              className="md:col-span-2"
            />
            <Input value={newModel.maxSpeed} onChange={(event) => setNewModel((current) => ({ ...current, maxSpeed: event.target.value }))} placeholder="Velocidad máxima" />
            <Input value={newModel.range} onChange={(event) => setNewModel((current) => ({ ...current, range: event.target.value }))} placeholder="Autonomía" />
            <Input value={newModel.battery} onChange={(event) => setNewModel((current) => ({ ...current, battery: event.target.value }))} placeholder="Batería" />
            <Input value={newModel.motor} onChange={(event) => setNewModel((current) => ({ ...current, motor: event.target.value }))} placeholder="Motor" />
            <Input value={newModel.weight} onChange={(event) => setNewModel((current) => ({ ...current, weight: event.target.value }))} placeholder="Peso" />
            <label className="flex items-center gap-2 text-sm text-[#374151]">
              <input
                type="checkbox"
                checked={newModel.isActive}
                onChange={(event) => setNewModel((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Modelo activo
            </label>
          </div>

          <div className="rounded-xl border border-[#e5e7eb] bg-[#fafafa] p-4">
            <p className="mb-2 text-sm font-medium text-[#111827]">Servicios compatibles</p>
            <div className="grid gap-2 md:grid-cols-2">
              {services.map((service) => (
                <label key={service.id} className="flex items-center gap-2 text-sm text-[#374151]">
                  <input
                    type="checkbox"
                    checked={newModel.compatibleServices.includes(service.id)}
                    onChange={(event) =>
                      setNewModel((current) => ({
                        ...current,
                        compatibleServices: event.target.checked
                          ? [...current.compatibleServices, service.id]
                          : current.compatibleServices.filter((id) => id !== service.id),
                      }))
                    }
                  />
                  {service.name}
                </label>
              ))}
            </div>
          </div>

          <Button
            onClick={() => void saveModel(newModel)}
            disabled={savingModel === "new" || !newModel.brandId || newModel.name.trim().length < 2}
          >
            <Save className="h-4 w-4" />
            Crear modelo
          </Button>

          <div className="space-y-3 pt-2">
            {models.length === 0 ? (
              <EmptyMessage text="Todavía no hay modelos cargados." />
            ) : (
              models.map((model) => (
                <ModelRow
                  key={model.id}
                  model={model}
                  brands={brands}
                  services={services}
                  brandName={brandMap[model.brandId] ?? model.brandId}
                  onSave={saveModel}
                  saving={savingModel === model.id}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function BrandRow({
  brand,
  saving,
  onSave,
}: {
  brand: ScooterBrand
  saving: boolean
  onSave: (payload: BrandDraft & { id?: string }) => Promise<void>
}) {
  const [draft, setDraft] = useState<BrandDraft>({
    name: brand.name,
    logoURL: brand.logoURL ?? "",
    isActive: brand.isActive,
  })

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-[#fafafa] p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        <Input value={draft.logoURL} onChange={(event) => setDraft((current) => ({ ...current, logoURL: event.target.value }))} placeholder="Logo URL" />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-[#374151]">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Activa
        </label>
        <Button size="sm" onClick={() => void onSave({ id: brand.id, ...draft })} disabled={saving}>
          Guardar
        </Button>
      </div>
    </div>
  )
}

function ModelRow({
  model,
  brands,
  services,
  brandName,
  saving,
  onSave,
}: {
  model: ScooterModel
  brands: ScooterBrand[]
  services: Service[]
  brandName: string
  saving: boolean
  onSave: (payload: ModelDraft & { id?: string }) => Promise<void>
}) {
  const [draft, setDraft] = useState<ModelDraft>({
    brandId: model.brandId,
    name: model.name,
    imageURL: model.imageURL ?? "",
    maxSpeed: String(model.specs.maxSpeed),
    range: String(model.specs.range),
    battery: model.specs.battery,
    motor: model.specs.motor,
    weight: String(model.specs.weight),
    compatibleServices: model.compatibleServices,
    isActive: model.isActive,
  })

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-[#fafafa] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-[#111827]">{model.name}</p>
          <p className="text-xs text-[#6b7280]">{brandName}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[#374151]">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => setDraft((current) => ({ ...current, isActive: event.target.checked }))}
          />
          Activo
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={draft.brandId}
          onChange={(event) => setDraft((current) => ({ ...current, brandId: event.target.value }))}
          className="h-11 rounded-lg border border-[#e5e7eb] bg-white px-4 text-sm text-[#111827]"
        >
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <Input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
        <Input value={draft.imageURL} onChange={(event) => setDraft((current) => ({ ...current, imageURL: event.target.value }))} placeholder="Imagen URL" className="md:col-span-2" />
        <Input value={draft.maxSpeed} onChange={(event) => setDraft((current) => ({ ...current, maxSpeed: event.target.value }))} placeholder="Velocidad máxima" />
        <Input value={draft.range} onChange={(event) => setDraft((current) => ({ ...current, range: event.target.value }))} placeholder="Autonomía" />
        <Input value={draft.battery} onChange={(event) => setDraft((current) => ({ ...current, battery: event.target.value }))} placeholder="Batería" />
        <Input value={draft.motor} onChange={(event) => setDraft((current) => ({ ...current, motor: event.target.value }))} placeholder="Motor" />
        <Input value={draft.weight} onChange={(event) => setDraft((current) => ({ ...current, weight: event.target.value }))} placeholder="Peso" />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {services.map((service) => (
          <label key={service.id} className="flex items-center gap-2 text-sm text-[#374151]">
            <input
              type="checkbox"
              checked={draft.compatibleServices.includes(service.id)}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  compatibleServices: event.target.checked
                    ? [...current.compatibleServices, service.id]
                    : current.compatibleServices.filter((id) => id !== service.id),
                }))
              }
            />
            {service.name}
          </label>
        ))}
      </div>

      <div className="mt-3 flex justify-end">
        <Button size="sm" onClick={() => void onSave({ id: model.id, ...draft })} disabled={saving}>
          Guardar modelo
        </Button>
      </div>
    </div>
  )
}
