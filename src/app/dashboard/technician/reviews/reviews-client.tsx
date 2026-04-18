"use client"

import { useState } from "react"
import { Star, MessageSquare, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Review } from "@/types"

interface Props {
  reviews: Review[]
  technicianId: string
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= rating ? "fill-[#f59e0b] text-[#f59e0b]" : "text-[#e5e7eb]"}`}
        />
      ))}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-UY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function ReviewCard({ review }: { review: Review }) {
  const [replyText, setReplyText] = useState(review.technicianReply ?? "")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReply() {
    if (!replyText.trim()) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ technicianReply: replyText.trim() }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? "Error al guardar la respuesta.")
        return
      }
      setSaved(true)
      setEditing(false)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError("Error de conexión.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <StarRating rating={review.rating} />
          <p className="mt-1 text-xs text-[#9ca3af]">{formatDate(review.createdAt)}</p>
        </div>
      </div>

      {/* Comment */}
      <p className="mb-4 text-sm text-[#374151]">{review.comment}</p>

      {/* Existing reply */}
      {review.technicianReply && !editing && (
        <div className="mb-3 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-4 py-3">
          <p className="mb-1 text-xs font-semibold text-[#6b7280]">Tu respuesta:</p>
          <p className="text-sm text-[#374151]">{review.technicianReply}</p>
          <button
            onClick={() => setEditing(true)}
            className="mt-2 cursor-pointer text-xs text-[#10b981] hover:underline"
          >
            Editar respuesta
          </button>
        </div>
      )}

      {saved && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#a7f3d0] bg-[#d1fae5] px-3 py-2 text-xs text-[#065f46]">
          <CheckCircle className="h-3.5 w-3.5" />
          Respuesta guardada.
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Reply form */}
      {(!review.technicianReply || editing) && (
        <div className="flex flex-col gap-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Escribí una respuesta pública (máx. 300 caracteres)…"
            maxLength={300}
            rows={3}
            className="w-full resize-none rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm text-[#111827] placeholder:text-[#9ca3af] focus:border-[#10b981] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-[#9ca3af]">{replyText.length}/300</span>
            <div className="flex gap-2">
              {editing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false)
                    setReplyText(review.technicianReply ?? "")
                  }}
                >
                  Cancelar
                </Button>
              )}
              <Button
                size="sm"
                disabled={saving || !replyText.trim()}
                onClick={() => void handleReply()}
              >
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                {saving ? "Guardando…" : "Responder"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function TechnicianReviewsClient({ reviews }: Props) {
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Reseñas recibidas</h1>
        <p className="mt-1 text-sm text-[#6b7280]">
          Podés responder públicamente a las reseñas de tus clientes.
        </p>
      </div>

      {/* Summary */}
      {reviews.length > 0 && (
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
            <Star className="h-7 w-7 fill-[#f59e0b] text-[#f59e0b]" />
          </div>
          <div>
            <p className="text-3xl font-bold text-[#111827]">{avgRating.toFixed(1)}</p>
            <p className="text-sm text-[#6b7280]">
              Promedio de {reviews.length} reseña{reviews.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] bg-white py-16 text-center">
          <Star className="mb-4 h-10 w-10 text-[#d1d5db]" />
          <p className="text-sm text-[#9ca3af]">
            Aún no tenés reseñas. ¡Completá servicios para que tus clientes puedan calificarte!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </section>
  )
}
