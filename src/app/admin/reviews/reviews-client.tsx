"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Eye, EyeOff, MessageSquareText, Search, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Review, Technician, User } from "@/types"

interface Props {
  reviews: Review[]
  users: Record<string, User>
  technicians: Record<string, Technician | null>
}

type Filter = "all" | "visible" | "hidden"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-UY", {
    dateStyle: "medium",
  })
}

export function AdminReviewsClient({ reviews: initialReviews, users, technicians }: Props) {
  const [reviews, setReviews] = useState(initialReviews)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Filter>("all")
  const [savingId, setSavingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return reviews.filter((review) => {
      const matchesFilter =
        filter === "all" ? true : filter === "hidden" ? Boolean(review.isHidden) : !review.isHidden
      if (!matchesFilter) return false

      const haystack = [
        review.comment,
        review.technicianReply ?? "",
        users[review.userId]?.displayName ?? "",
        technicians[review.technicianId]?.displayName ?? "",
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(query.toLowerCase())
    })
  }, [filter, query, reviews, technicians, users])

  async function toggleHidden(review: Review) {
    setSavingId(review.id)
    try {
      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, isHidden: !review.isHidden }),
      })

      const json = (await response.json()) as { error?: string; data?: { isHidden: boolean } }
      if (!response.ok || !json.data) {
        toast.error(json.error ?? "No pudimos actualizar la reseña.")
        return
      }

      setReviews((current) =>
        current.map((item) =>
          item.id === review.id
            ? { ...item, isHidden: json.data!.isHidden, moderatedAt: new Date().toISOString() }
            : item,
        ),
      )
      toast.success(json.data.isHidden ? "Reseña ocultada." : "Reseña restaurada.")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Moderación de reseñas</h1>
          <p className="mt-1 text-sm text-[#6b7280]">
            Revisá comentarios problemáticos, respuestas técnicas y visibilidad pública.
          </p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
          <MessageSquareText className="h-5 w-5 text-[#2563eb]" />
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-10" placeholder="Buscar por comentario, usuario o técnico" />
        </div>
        <div className="flex gap-2">
          {[
            { id: "all", label: "Todas" },
            { id: "visible", label: "Visibles" },
            { id: "hidden", label: "Ocultas" },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id as Filter)}
              className={`rounded-xl px-4 py-2 text-sm font-medium ${
                filter === option.id ? "bg-[#111827] text-white" : "bg-[#f3f4f6] text-[#6b7280]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((review) => (
          <article key={review.id} className="rounded-2xl border border-[#e5e7eb] bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#111827]">
                    {users[review.userId]?.displayName ?? review.userId}
                  </span>
                  <span className="text-sm text-[#6b7280]">→</span>
                  <span className="text-sm text-[#374151]">
                    {technicians[review.technicianId]?.displayName ?? review.technicianId}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#6b7280]">{formatDate(review.createdAt)}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  review.isHidden ? "bg-red-50 text-red-600" : "bg-[#d1fae5] text-[#065f46]"
                }`}
              >
                {review.isHidden ? "Oculta" : "Visible"}
              </span>
            </div>

            <div className="mt-4 flex items-center gap-1 text-amber-500">
              {Array.from({ length: review.rating }).map((_, index) => (
                <Star key={index} className="h-4 w-4 fill-current" />
              ))}
            </div>

            <p className="mt-3 text-sm text-[#111827]">{review.comment}</p>
            {review.technicianReply ? (
              <div className="mt-3 rounded-xl bg-[#f8fafc] p-3 text-sm text-[#374151]">
                <span className="font-medium">Respuesta técnica:</span> {review.technicianReply}
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <Button variant={review.isHidden ? "secondary" : "outline"} size="sm" disabled={savingId === review.id} onClick={() => void toggleHidden(review)}>
                {review.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {review.isHidden ? "Restaurar" : "Ocultar"}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
