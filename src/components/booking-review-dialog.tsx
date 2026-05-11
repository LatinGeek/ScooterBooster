"use client"

import { useEffect, useState } from "react"
import { ReviewForm } from "@/components/review-form"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { canUserReviewBooking, isBookingOverdueForUserReview } from "@/lib/review-eligibility"
import type { Booking, Technician } from "@/types"

interface BookingReviewDialogProps {
  booking: Booking
  technician: Technician
  hasReview: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted?: () => void
}

export function BookingReviewDialog({
  booking,
  technician,
  hasReview,
  open,
  onOpenChange,
  onSubmitted,
}: BookingReviewDialogProps) {
  const [submitted, setSubmitted] = useState(false)
  const isOverdue = isBookingOverdueForUserReview(booking)

  useEffect(() => {
    if (!open) {
      setSubmitted(false)
    }
  }, [open])

  if (!canUserReviewBooking(booking) || hasReview) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isOverdue ? "¿Ya se realizó el servicio?" : "Dejá tu reseña"}
          </DialogTitle>
          <DialogDescription>
            {submitted
              ? "La reserva quedó cerrada y tu reseña ya fue enviada."
              : isOverdue
                ? "Pasó más de un día del turno y el técnico todavía no lo marcó como completado. Si el servicio ya se hizo, podés cerrar la reserva y dejar tu reseña ahora."
                : "El técnico marcó la reserva como completada. Podés dejar una reseña ahora mismo."}
          </DialogDescription>
        </DialogHeader>

        <ReviewForm
          bookingId={booking.id}
          technicianId={booking.technicianId}
          technicianName={technician.displayName}
          compact
          title={`¿Cómo fue tu experiencia con ${technician.displayName}?`}
          description={
            isOverdue
              ? "Al enviarla vamos a marcar esta reserva como completada."
              : "Tu opinión ayuda a otros usuarios a elegir técnico."
          }
          submitLabel={isOverdue ? "Marcar como completada y enviar reseña" : "Enviar reseña"}
          onSuccess={() => {
            setSubmitted(true)
            onSubmitted?.()
            window.setTimeout(() => onOpenChange(false), 1200)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
