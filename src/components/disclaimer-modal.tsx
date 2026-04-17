"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface DisclaimerModalProps {
  open: boolean
  onAccept: () => void
  onDecline: () => void
}

/**
 * Mandatory legal disclaimer for speed limit removal services.
 * The user must explicitly check the checkbox before proceeding.
 * Acceptance is recorded with a timestamp for audit purposes.
 */
export function DisclaimerModal({ open, onAccept, onDecline }: DisclaimerModalProps) {
  const [accepted, setAccepted] = useState(false)

  function handleAccept() {
    if (!accepted) return
    setAccepted(false)
    onAccept()
  }

  function handleDecline() {
    setAccepted(false)
    onDecline()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleDecline()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle>Aviso Legal Importante</DialogTitle>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-[#111827]">
          <p>
            <strong>Aviso Legal:</strong> La modificación del límite de velocidad de su scooter
            eléctrico está destinada únicamente para uso en propiedad privada y circuitos cerrados.
            ScooterBooster no se responsabiliza por el uso de scooters modificados en vías públicas.
            El usuario asume toda responsabilidad por el cumplimiento de las normativas de tránsito
            vigentes en Uruguay. Al continuar, usted acepta estos términos.
          </p>
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 cursor-pointer rounded border-[#e5e7eb] accent-[#10b981]"
          />
          <span className="text-sm text-[#6b7280]">
            He leído y acepto el aviso legal. Utilizaré el scooter modificado únicamente en
            propiedad privada o circuitos cerrados.
          </span>
        </label>

        <DialogFooter>
          <Button variant="outline" onClick={handleDecline}>
            Cancelar
          </Button>
          <Button onClick={handleAccept} disabled={!accepted}>
            Acepto y continúo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
