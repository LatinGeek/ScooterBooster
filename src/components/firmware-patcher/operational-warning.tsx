import { TriangleAlert } from "lucide-react"

/**
 * Persistent, non-blocking operational notice (SPEC FP-009). It is intentionally NOT a dialog,
 * NOT dismissible and does not gate any control: there is no legal disclaimer in this tool.
 */
export function OperationalWarning() {
  return (
    <section
      aria-label="Aviso operativo"
      data-testid="firmware-operational-warning"
      className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-semibold">Herramienta interna, solo para técnicos y administradores</p>
        <p>
          Los parches experimentales no están validados en hardware real y modificar un firmware
          puede dejar el scooter inutilizable. Esta herramienta solo genera un archivo{" "}
          <strong>.bin</strong>: no lo instala ni lo flashea en ningún dispositivo.
        </p>
      </div>
    </section>
  )
}
