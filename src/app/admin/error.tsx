"use client"

import { useEffect } from "react"
import { AdminErrorFallback } from "@/components/admin-error-boundary"

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error("Admin route error:", error)
  }, [error])

  return <AdminErrorFallback error={error} onRetry={unstable_retry} />
}
