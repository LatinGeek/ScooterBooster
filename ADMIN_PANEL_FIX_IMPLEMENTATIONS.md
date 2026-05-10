# Admin Panel - Detailed Fix Implementations

This document contains ready-to-use code snippets to fix all identified admin panel issues.

---

## Fix #1: Dashboard Trend Calculation (Dashboard Overview)

**File:** `src/app/admin/page.tsx`

**Issue:** Bookings with malformed `createdAt` field are silently excluded from trends

**Current Code (lines 91-97):**
```typescript
const createdAtRaw = data["createdAt"]
const createdAt =
  typeof createdAtRaw === "string"
    ? createdAtRaw
    : typeof (createdAtRaw as FirebaseFirestore.Timestamp | undefined)?.toDate === "function"
      ? (createdAtRaw as FirebaseFirestore.Timestamp).toDate().toISOString()
      : null
```

**Fixed Code:**
```typescript
// Helper function at top of file
function extractBookingDate(createdAtRaw: unknown): string | null {
  // If it's already a string, assume it's ISO format
  if (typeof createdAtRaw === "string") {
    return createdAtRaw.slice(0, 10) // Return YYYY-MM-DD
  }
  
  // If it's a Firebase Timestamp with toDate method
  if (createdAtRaw && typeof (createdAtRaw as any).toDate === "function") {
    try {
      const dateObj = (createdAtRaw as any).toDate() as Date
      return dateObj.toISOString().slice(0, 10)
    } catch {
      console.warn("Failed to parse Timestamp:", createdAtRaw)
      return null
    }
  }
  
  // If it's a Date object
  if (createdAtRaw instanceof Date) {
    return createdAtRaw.toISOString().slice(0, 10)
  }
  
  // Invalid format
  console.warn("Unknown createdAt format:", createdAtRaw)
  return null
}

// Then update the booking loop (replace lines 86-123):
let totalGMV = 0
let platformRevenue = 0
let completedBookings = 0
let activeBookings = 0

for (const doc of bookingsSnap.docs) {
  const data = doc.data()
  const status = (data["status"] as string | undefined) ?? "pending"
  const totalPrice = (data["totalPrice"] as number) ?? 0
  const serviceFee = (data["serviceFee"] as number) ?? 0

  if (status === "completed") {
    completedBookings++
    totalGMV += totalPrice
    platformRevenue += serviceFee
  }

  if (status === "pending" || status === "confirmed" || status === "in_progress") {
    activeBookings++
  }

  if (status === "pending") bookingStatusCounts.pending++
  else if (status === "confirmed") bookingStatusCounts.confirmed++
  else if (status === "in_progress") bookingStatusCounts.in_progress++
  else if (status === "completed") bookingStatusCounts.completed++
  else if (status === "expired") bookingStatusCounts.expired++
  else bookingStatusCounts.cancelled++

  // Add booking to daily trend
  const dateStr = extractBookingDate(data["createdAt"])
  if (dateStr) {
    const trend = trends.get(dateStr)
    if (trend) {
      trend.bookings += 1
      trend.gmv += totalPrice
    } else {
      console.warn("Trend not found for date:", dateStr)
    }
  }
}
```

---

## Fix #2: Settings Input Validation

**File:** `src/app/admin/settings/page.tsx`

**Issue:** Service fee can be set to invalid values

**Current Code (lines 34-58):**
```typescript
async function handleSave() {
  setSaving(true)
  setError(null)
  setSaved(false)
  try {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceFeeAmount: fee }),
    })
    // ...
  }
}
```

**Fixed Code:**
```typescript
async function handleSave() {
  // Validation
  if (fee < 0 || !Number.isFinite(fee)) {
    setError("La comisión no puede ser negativa")
    return
  }
  
  if (fee > 100000) {
    setError("La comisión no puede exceder $100,000")
    return
  }
  
  const feeInt = Math.round(fee)
  if (feeInt !== fee) {
    setError("La comisión debe ser un número entero")
    return
  }

  setSaving(true)
  setError(null)
  setSaved(false)
  try {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceFeeAmount: feeInt }),
    })
    if (!res.ok) {
      const data = (await res.json()) as { error?: string }
      setError(data.error ?? "Error al guardar.")
      return
    }
    const updated = (await res.json()) as { data?: Config }
    if (updated.data) setConfig(updated.data)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  } catch {
    setError("Error de conexión.")
  } finally {
    setSaving(false)
  }
}
```

Also fix the typo on line 75:
```typescript
// Before:
<h1 className="text-2xl font-bold text-[#111827]">Configuracion de la plataforma</h1>

// After:
<h1 className="text-2xl font-bold text-[#111827]">Configuración de la plataforma</h1>
```

And fix line 89:
```typescript
// Before:
<h2 className="font-semibold text-[#111827]">Comision de la plataforma</h2>

// After:
<h2 className="font-semibold text-[#111827]">Comisión de la plataforma</h2>
```

---

## Fix #3: Bookings - Confirmation Dialog

**File:** `src/app/admin/bookings/bookings-client.tsx`

**Issue:** Destructive actions happen without confirmation

**Current Code (around line 80-100):**
```typescript
async function cancelBooking(booking: Booking) {
  setBusyId(booking.id)
  try {
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: booking.id, action: "cancel" }),
    })
    // ...
  }
}
```

**Fixed Code:**
```typescript
async function cancelBooking(booking: Booking) {
  // Show confirmation dialog
  const confirmed = window.confirm(
    `¿Cancelar esta reserva? Esta acción no se puede deshacer.\n\n` +
    `Técnico: ${technicians[booking.technicianId]?.displayName || "Unknown"}\n` +
    `Usuario: ${users[booking.userId]?.displayName || "Unknown"}`
  )
  
  if (!confirmed) {
    return
  }

  setBusyId(booking.id)
  try {
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: booking.id, action: "cancel" }),
    })
    if (!res.ok) throw new Error("Failed to cancel")
    
    setBookings(prev => prev.map(b => 
      b.id === booking.id ? { ...b, status: "cancelled_by_technician" as const } : b
    ))
    toast.success("Reserva cancelada")
  } catch (error) {
    toast.error("Error al cancelar la reserva")
  } finally {
    setBusyId(null)
  }
}
```

---

## Fix #4: Scooters - Confirmation on Delete

**File:** `src/app/admin/scooters/scooters-client.tsx`

**Issue:** Deleting brands/models has no confirmation

**Add this helper function:**
```typescript
function useConfirmedDelete(
  resourceType: "brand" | "model",
  resourceName: string,
  onConfirm: () => Promise<void>
) {
  const [loading, setLoading] = useState(false)
  
  const handleDelete = async () => {
    const message = resourceType === "brand"
      ? `¿Eliminar la marca "${resourceName}"? Esto también eliminará todos sus modelos.`
      : `¿Eliminar el modelo "${resourceName}"?`
    
    if (!window.confirm(message + "\n\nEsta acción no se puede deshacer.")) {
      return
    }
    
    setLoading(true)
    try {
      await onConfirm()
      toast.success(`${resourceType === "brand" ? "Marca" : "Modelo"} eliminado`)
    } catch (error) {
      toast.error("Error al eliminar")
    } finally {
      setLoading(false)
    }
  }
  
  return { handleDelete, loading }
}
```

Then use it in delete buttons:
```typescript
const { handleDelete, loading } = useConfirmedDelete("brand", brand.name, async () => {
  await fetch(`/api/admin/catalog/brands/${brand.id}`, { method: "DELETE" })
})

return (
  <button onClick={handleDelete} disabled={loading}>
    {loading ? "Eliminando..." : "Eliminar"}
  </button>
)
```

---

## Fix #5: Error Boundaries for Data Pages

**File:** Create new file `src/components/admin-error-boundary.tsx`

```typescript
"use client"

import React, { ReactNode } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AdminErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Admin panel error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6">
          <AlertCircle className="h-8 w-8 text-red-600 mb-3" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error al cargar</h2>
          <p className="text-sm text-red-700 mb-4">{this.state.error?.message || "Error desconocido"}</p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            variant="outline"
          >
            Reintentar
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
```

Then wrap pages:
```typescript
// In technicians/page.tsx, users/page.tsx, bookings/page.tsx, etc.
import { AdminErrorBoundary } from "@/components/admin-error-boundary"

return (
  <AdminErrorBoundary>
    <AdminTechniciansClient {...props} />
  </AdminErrorBoundary>
)
```

---

## Fix #6: Users Pagination

**File:** `src/app/admin/users/page.tsx`

**Current Code:**
```typescript
const users = await getLatestUsers(150)
```

**New Code with Pagination:**
```typescript
const searchParams = await props.searchParams // Get from page params
const page = parseInt(searchParams?.page || "1", 10)
const pageSize = 50

const users = await getLatestUsers(pageSize, {
  page,
  startAfter: searchParams?.cursor,
})

return (
  <AdminUsersClient 
    users={users} 
    currentAdminUid={session.uid}
    page={page}
    pageSize={pageSize}
    hasMore={users.length === pageSize}
  />
)
```

Update the database function:
```typescript
// In lib/db/users.ts
export async function getLatestUsers(
  limit: number,
  options?: { page?: number; startAfter?: string }
) {
  let query = adminDb
    .collection("users")
    .orderBy("createdAt", "desc")
    .limit(limit + 1) // Fetch one extra to determine if there are more

  if (options?.startAfter) {
    const lastDoc = await adminDb.collection("users").doc(options.startAfter).get()
    query = query.startAfter(lastDoc)
  }

  const snapshot = await query.get()
  const users = snapshot.docs.slice(0, limit).map(doc => doc.data())
  const hasMore = snapshot.docs.length > limit

  return { users, hasMore, lastId: snapshot.docs[limit - 1]?.id }
}
```

---

## Fix #7: Timezone Awareness in Audit Log

**File:** `src/app/admin/audit/page.tsx`

**Add helper function:**
```typescript
function formatAuditTimestamp(isoString: string, adminTimezone?: string): string {
  const date = new Date(isoString)
  
  // Format in admin's timezone (default to browser timezone)
  return date.toLocaleString("es-UY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: adminTimezone || undefined,
  })
}
```

Then update the display:
```typescript
// In the audit log table
{formatAuditTimestamp(entry.timestamp, userPreferences?.timezone)}
```

---

## Fix #8: Disable Sentry in Build (If Needed)

**Option A: Rebuild without Cache**
```bash
cd /path/to/ScooterBooster
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies (in case of corrupted node_modules)
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build

# Test locally
npm run dev
```

**Option B: Disable Sentry Temporarily**
```bash
# In .env.local or deployment config
SENTRY_DSN=

# Then rebuild and deploy
npm run build
npm start
```

**Option C: Fix Sentry Configuration (Proper Solution)**

The issue is that Sentry is trying to hook into require() at build time. Update `sentry.*.config.ts` files to handle missing dependencies gracefully:

```typescript
// In sentry.server.config.ts
import * as Sentry from "@sentry/nextjs"

const SENTRY_DSN = process.env.SENTRY_DSN

// Only initialize if DSN is set
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    // ... rest of config
  })
}

export default Sentry
```

---

## Testing Checklist

After implementing fixes, test:

- [ ] Dashboard loads without errors and trends display correctly
- [ ] Settings page validates fee input (test negative, decimal, max values)
- [ ] Booking cancellation shows confirmation dialog
- [ ] Users pagination works (50 per page)
- [ ] No page crashes when data is malformed
- [ ] Audit log shows formatted timestamps
- [ ] Spanish text uses proper accents (Configuración, Comisión)
- [ ] Sentry error tracking functions in production
- [ ] All admin pages have error recovery options

---

## Implementation Priority

1. **Immediate (Today):** Fix Sentry rebuild + Dashboard date fix
2. **This Week:** Add validation to Settings, add confirmations
3. **Next Sprint:** Implement pagination, error boundaries, timezone support

