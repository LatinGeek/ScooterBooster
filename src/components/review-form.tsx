"use client"

import { useId, useState } from "react"
import { CheckCircle, Loader2, Star } from "lucide-react"
import { trackAnalyticsEvent } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface ReviewFormProps {
  bookingId: string
  technicianId: string
  technicianName: string
  onSuccess?: () => void
  compact?: boolean
  title?: string
  description?: string
  submitLabel?: string
}

export function ReviewForm({
  bookingId,
  technicianId,
  technicianName,
  onSuccess,
  compact = false,
  title,
  description,
  submitLabel = "Enviar reseña",
}: ReviewFormProps) {
  const textareaId = useId()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      setError("Por favor seleccioná una calificación")
      return
    }
    if (comment.length < 10) {
      setError("El comentario debe tener al menos 10 caracteres")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, technicianId, rating, comment }),
      })
      const json = (await res.json()) as { success: boolean; error?: string }

      if (!res.ok || !json.success) {
        setError(json.error ?? "Error al enviar la reseña. Intentá de nuevo.")
        return
      }

      setSubmitted(true)
      trackAnalyticsEvent("review_submitted", {
        booking_id: bookingId,
        technician_id: technicianId,
        rating,
      })
      onSuccess?.()
    } catch {
      setError("Error de conexión. Revisá tu internet e intentá de nuevo.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#a7f3d0] bg-[#d1fae5] px-4 py-4">
        <CheckCircle className="h-5 w-5 shrink-0 text-[#10b981]" />
        <div>
          <p className="font-semibold text-[#065f46]">Gracias por tu reseña</p>
          <p className="text-sm text-[#065f46]">Tu opinión ayuda a la comunidad ScooterBooster.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("rounded-xl border border-[#e5e7eb] bg-white p-5", compact && "border-0 p-0 shadow-none")}>
      <h3 className="mb-2 font-semibold text-[#111827]">
        {title ?? `¿Cómo fue tu experiencia con ${technicianName}?`}
      </h3>
      {description ? <p className="mb-4 text-sm text-[#6b7280]">{description}</p> : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-[#374151]">Calificación *</p>
          <div className="flex gap-1" role="group" aria-label="Calificación de 1 a 5 estrellas">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
                className="cursor-pointer rounded transition-transform duration-100 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] focus-visible:ring-offset-1"
              >
                <Star
                  className={`h-8 w-8 transition-colors duration-100 ${
                    star <= (hovered || rating)
                      ? "fill-amber-400 text-amber-400"
                      : "fill-transparent text-[#d1d5db]"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 ? (
            <p className="mt-1 text-xs text-[#6b7280]">
              {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][rating]}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor={textareaId} className="block text-sm font-medium text-[#374151]">
            Comentario *
          </label>
          <textarea
            id={textareaId}
            rows={4}
            minLength={10}
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Contá cómo fue el servicio, puntualidad, calidad del trabajo..."
            className="mt-1 block w-full resize-none rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 text-sm text-[#111827] placeholder-[#9ca3af] focus:border-[#10b981] focus:outline-none focus:ring-1 focus:ring-[#10b981]"
          />
          <p className="mt-1 text-right text-xs text-[#9ca3af]">{comment.length}/500</p>
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={submitting || rating === 0}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </form>
    </div>
  )
}
