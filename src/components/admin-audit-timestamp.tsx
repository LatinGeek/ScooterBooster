"use client"

import { useState } from "react"

function formatAuditTimestamp(isoString: string, adminTimezone?: string): string {
  const date = new Date(isoString)

  return date.toLocaleString("es-UY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: adminTimezone || undefined,
  })
}

export function AuditTimestamp({
  isoString,
  adminTimezone,
}: {
  isoString: string
  adminTimezone?: string
}) {
  const [resolvedTimezone] = useState(() => adminTimezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone)

  return (
    <time dateTime={isoString} suppressHydrationWarning>
      {formatAuditTimestamp(isoString, resolvedTimezone)}
    </time>
  )
}
