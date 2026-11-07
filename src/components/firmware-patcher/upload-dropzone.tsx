"use client"

import { forwardRef, useState } from "react"
import { FileUp, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
}

interface UploadDropzoneProps {
  file: File | null
  disabled?: boolean
  maxBytes: number
  errorId?: string
  invalid?: boolean
  onFiles: (files: File[]) => void
  onClear: () => void
}

/**
 * Drag & drop + keyboard-accessible file picker. The native input stays focusable (visually hidden)
 * so Enter/Space open the picker; the surrounding label shows the focus ring.
 */
export const UploadDropzone = forwardRef<HTMLInputElement, UploadDropzoneProps>(function UploadDropzone(
  { file, disabled, maxBytes, errorId, invalid, onFiles, onClear },
  inputRef
) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="space-y-3">
      <label
        data-testid="firmware-dropzone"
        onDragOver={(event) => {
          if (disabled) return
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (disabled) return
          onFiles(Array.from(event.dataTransfer.files))
        }}
        className={cn(
          "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-200 motion-reduce:transition-none",
          "focus-within:ring-2 focus-within:ring-[#10b981] focus-within:ring-offset-2",
          dragging ? "border-[#10b981] bg-[#d1fae5]" : "border-[#e5e7eb] bg-[#fafafa] hover:border-[#10b981]",
          invalid && "border-red-400",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".bin,application/octet-stream"
          className="sr-only"
          disabled={disabled}
          aria-label="Archivo de firmware (.bin)"
          aria-describedby={errorId}
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            onFiles(Array.from(event.target.files ?? []))
            // Allow re-selecting the same file after clearing.
            event.target.value = ""
          }}
        />
        <FileUp className="h-8 w-8 text-[#10b981]" aria-hidden="true" />
        <span className="text-sm font-semibold text-[#111827]">
          {file ? "Cambiar archivo" : "Arrastrá el firmware acá o tocá para elegirlo"}
        </span>
        <span className="text-xs text-[#6b7280]">Un único archivo .bin, hasta {formatBytes(maxBytes)}</span>
      </label>

      {file ? (
        <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#111827]" data-testid="firmware-file-name">
              {file.name}
            </p>
            <p className="text-xs text-[#6b7280]">{formatBytes(file.size)}</p>
          </div>
          <Button type="button" variant="outline" onClick={onClear} disabled={disabled} className="shrink-0">
            <X className="h-4 w-4" aria-hidden="true" />
            Quitar
          </Button>
        </div>
      ) : null}
    </div>
  )
})
