"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Bike, PlusCircle, Save, Trash2 } from "lucide-react"
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
  const [deletingBrandId, setDeletingBrandId] = useState<string | null>(null)
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null)

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

  const brandMap = useMemo(() => Object.fromEntries(brands.map((brand) => [brand.id, brand.name])), [brands])
  const resolvedNewModelBrandId = brands.some((brand) => brand.id === newModel.brandId)
    ? newModel.brandId
    : brands[0]?.id ?? ""

  async function saveBrand(payload: BrandDraft & { id?: string }) {
    const isCreate = !payload.id
    setSavingBrand(payload.id ?? "new")
    try {
      const response = await fetch("/api/admin/catalog/brands", {
        method: isCreate ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          logoURL: payload.logoURL.trim() || null,
        }),
      })

      const json = (await response.json()) as { error?: string; data?: ScooterBrand }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos guardar la marca.")
        return
      }
      const brand = json.data

      setBrands((current) =>
        isCreate
          ? [...current, brand].sort((a, b) => a.name.localeCompare(b.name, "es"))
          : current.map((item) => (item.id === brand.id ? brand : item)),
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
          brandId: payload.brandId || resolvedNewModelBrandId,
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

      const json = (await response.json()) as { error?: string; data?: ScooterModel }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos guardar el modelo.")
        return
      }
      const model = json.data

      setModels((current) =>
        isCreate
          ? [...current, model].sort((a, b) => a.name.localeCompare(b.name, "es"))
          : current.map((item) => (item.id === model.id ? model : item)),
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

  async function deleteBrand(brand: ScooterBrand) {
    const confirmed = window.confirm(
      `¿Eliminar la marca "${brand.name}"?\n\nEsto también eliminará todos sus modelos y no se puede deshacer.`,
    )
    if (!confirmed) return

    setDeletingBrandId(brand.id)
    try {
      const response = await fetch("/api/admin/catalog/brands", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: brand.id }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(json.error ?? "No pudimos eliminar la marca.")
        return
      }

      setBrands((current) => current.filter((item) => item.id !== brand.id))
      setModels((current) => current.filter((item) => item.brandId !== brand.id))
      toast.success("Marca eliminada.")
    } catch {
      toast.error("No pudimos eliminar la marca.")
    } finally {
      setDeletingBrandId(null)
    }
  }

  async function deleteModel(model: ScooterModel) {
    const confirmed = window.confirm(`¿Eliminar el modelo "${model.name}"?\n\nEsta acción no se puede deshacer.`)
    if (!confirmed) return

    setDeletingModelId(model.id)
    try {
      const response = await fetch("/api/admin/catalog/models", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: model.id }),
      })
      const json = (await response.json()) as { error?: string }
      if (!response.ok) {
        toast.error(json.error ?? "No pudimos eliminar el modelo.")
        return
      }

      setModels((current) => current.filter((item) => item.id !== model.id))
      toast.success("Modelo eliminado.")
    } catch {
      toast.error("No pudimos eliminar el modelo.")
    } finally {
      setDeletingModelId(null)
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

          <Button onClick={() => void saveBrand(newBrand)} disabled={savingBrand === "new" || newBrand.name.trim().length < 2}>
            <Save className="h-4 w-4" />
            Crear marca
          </Button>

          <div className="space-y-3 pt-2">
            {brands.length === 0 ? (
              <EmptyMessage text="Todavía no hay marcas cargadas." />
            ) : (
              brands.map((brand) => (
                <BrandRow
                  key={`${brand.id}:${brand.name}:${brand.logoURL ?? ""}:${brand.isActive}`}
                  brand={brand}
                  onSave={saveBrand}
                  onDelete={deleteBrand}
                  saving={savingBrand === brand.id}
                  deleting={deletingBrandId === brand.id}
                />
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
              value={resolvedNewModelBrandId}
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
                  key={`${model.id}:${model.brandId}:${model.name}:${model.imageURL ?? ""}:${model.isActive}`}
                  model={model}
                  brands={brands}
                  services={services}
                  brandName={brandMap[model.brandId] ?? model.brandId}
                  onSave={saveModel}
                  onDelete={deleteModel}
                  saving={savingModel === model.id}
                  deleting={deletingModelId === model.id}
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
  deleting,
  onSave,
  onDelete,
}: {
  brand: ScooterBrand
  saving: boolean
  deleting: boolean
  onSave: (payload: BrandDraft & { id?: string }) => Promise<void>
  onDelete: (brand: ScooterBrand) => Promise<void>
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
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => void onDelete(brand)}
            disabled={saving || deleting}
            className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
          <Button size="sm" onClick={() => void onSave({ id: brand.id, ...draft })} disabled={saving || deleting}>
            Guardar
          </Button>
        </div>
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
  deleting,
  onSave,
  onDelete,
}: {
  model: ScooterModel
  brands: ScooterBrand[]
  services: Service[]
  brandName: string
  saving: boolean
  deleting: boolean
  onSave: (payload: ModelDraft & { id?: string }) => Promise<void>
  onDelete: (model: ScooterModel) => Promise<void>
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

      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void onDelete(model)}
          disabled={saving || deleting}
          className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
        >
          <Trash2 className="h-4 w-4" />
          {deleting ? "Eliminando..." : "Eliminar"}
        </Button>
        <Button size="sm" onClick={() => void onSave({ id: model.id, ...draft })} disabled={saving || deleting}>
          Guardar modelo
        </Button>
      </div>
    </div>
  )
}
