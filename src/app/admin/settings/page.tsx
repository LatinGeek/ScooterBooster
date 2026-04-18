"use client"

import { useState, useEffect } from "react"
import { Settings, CheckCircle, Loader2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Config {
  serviceFeePercentage: number
  updatedAt?: string
  updatedBy?: string
}

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [fee, setFee] = useState(10)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json: { data?: Config }) => {
        if (json.data) {
          setConfig(json.data)
          setFee(json.data.serviceFeePercentage)
        }
      })
      .catch(() => setError("Error al cargar la configuración."))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceFeePercentage: fee }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? "Error al guardar.")
        return
      }
      const updated = (await res.json()) as { data?: Config }
      if (updated.data) setConfig(updated.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Error de conexión.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    )
  }

  const exampleBase = 1000
  const exampleFee = Math.round(exampleBase * (fee / 100))
  const exampleTotal = exampleBase + exampleFee

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Configuración de la plataforma</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Estos cambios aplican a todas las reservas nuevas.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#a7f3d0] bg-[#d1fae5] px-4 py-3 text-sm text-[#065f46]">
          <CheckCircle className="h-4 w-4" />
          Configuración guardada. Efectiva en las próximas reservas.
        </div>
      )}

      <div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
            <Settings className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-[#111827]">Comisión de la plataforma</h2>
            <p className="text-sm text-[#6b7280]">
              Porcentaje que ScooterBooster agrega sobre el precio base del técnico.
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <label htmlFor="fee" className="shrink-0 text-sm font-medium text-[#374151]">
            Porcentaje (0–50%):
          </label>
          <input
            id="fee"
            type="number"
            min={0}
            max={50}
            value={fee}
            onChange={(e) => setFee(Math.min(50, Math.max(0, parseInt(e.target.value) || 0)))}
            className="w-24 rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm text-[#111827] focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <span className="text-2xl font-bold text-[#111827]">{fee}%</span>
        </div>

        {/* Visual example */}
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1d4ed8]" />
          <div className="text-sm text-[#1d4ed8]">
            <p className="font-medium">Ejemplo con precio base $1.000:</p>
            <ul className="mt-1 space-y-0.5">
              <li>Técnico recibe: <strong>${exampleBase.toLocaleString("es-UY")}</strong></li>
              <li>Comisión plataforma: <strong>${exampleFee.toLocaleString("es-UY")}</strong></li>
              <li>Cliente paga: <strong>${exampleTotal.toLocaleString("es-UY")}</strong></li>
            </ul>
          </div>
        </div>

        {config?.updatedAt && (
          <p className="mb-4 text-xs text-[#9ca3af]">
            Última actualización:{" "}
            {new Date(config.updatedAt).toLocaleString("es-UY")}
          </p>
        )}

        <Button onClick={() => void handleSave()} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando…
            </>
          ) : (
            "Guardar configuración"
          )}
        </Button>
      </div>
    </section>
  )
}
