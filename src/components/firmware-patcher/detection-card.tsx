import { forwardRef } from "react"
import { CircleAlert, CircleCheck, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import type { FirmwareDetection } from "./api-types"

interface DetectionCardProps {
  loading: boolean
  detection: FirmwareDetection | null
}

/** Shows the server-side detection result, including why a model was picked (SPEC FP-004/013). */
export const DetectionCard = forwardRef<HTMLHeadingElement, DetectionCardProps>(function DetectionCard(
  { loading, detection },
  headingRef
) {
  const patchable = Boolean(detection?.ok && detection.supported && detection.model)

  return (
    <Card data-testid="firmware-detection-card" aria-busy={loading}>
      <CardHeader>
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-xl leading-tight font-semibold text-[#111827] focus:outline-none"
        >
          2. Modelo detectado
        </h2>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-[#6b7280]">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Analizando el encabezado del firmware…
          </p>
        ) : null}

        {detection && !loading ? (
          <>
            {patchable ? (
              <div className="flex flex-wrap items-center gap-2">
                <CircleCheck className="h-5 w-5 text-[#059669]" aria-hidden="true" />
                <p className="text-base font-semibold text-[#111827]" data-testid="firmware-detected-model">
                  {detection.displayName ?? detection.model}
                </p>
                <Badge variant="default">{detection.model}</Badge>
              </div>
            ) : (
              <div
                className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                data-testid="firmware-unsupported"
              >
                <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    {detection.model
                      ? `Modelo reconocido (${detection.displayName ?? detection.model}), pero no se puede parchear`
                      : "No se pudo detectar el modelo"}
                  </p>
                  <p>
                    No se muestran parches para este archivo. Verificá que sea un firmware original de un
                    modelo soportado; no es posible forzar el modelo manualmente.
                  </p>
                </div>
              </div>
            )}

            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <Fact label="Familia" value={detection.family} />
              <Fact label="Contenedor" value={detection.container} />
              <Fact label="Puntaje" value={detection.score === null ? null : String(detection.score)} />
            </dl>

            {detection.hits.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">Por qué se eligió este modelo</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-[#6b7280]">
                  {detection.hits.map((hit) => (
                    <li key={hit}>{hit}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {detection.notes.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <h3 className="font-semibold">Advertencias de la detección</h3>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {detection.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  )
})

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-[#6b7280]">{label}</dt>
      <dd className="mt-0.5 font-medium break-words text-[#111827]">{value ?? "—"}</dd>
    </div>
  )
}
