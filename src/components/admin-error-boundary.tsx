"use client"

import React, { type ReactNode } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface FallbackProps {
  error?: Error | null
  onRetry?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export function AdminErrorFallback({ error, onRetry }: FallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <AlertCircle className="mb-3 h-8 w-8 text-red-600" />
      <h2 className="mb-2 text-lg font-semibold text-red-800">Error al cargar</h2>
      <p className="mb-4 text-sm text-red-700">{error?.message || "Ocurrió un error inesperado."}</p>
      <Button onClick={onRetry ?? (() => window.location.reload())} variant="outline">
        Reintentar
      </Button>
    </div>
  )
}

export class AdminErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Admin panel error:", error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <AdminErrorFallback
          error={this.state.error}
          onRetry={() => {
            this.setState({ hasError: false, error: null })
            window.location.reload()
          }}
        />
      )
    }

    return this.props.children
  }
}
