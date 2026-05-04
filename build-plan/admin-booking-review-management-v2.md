# Admin Dashboard — Booking & Review Management V2

**Target audience:** Semi-senior LLM agent (Alan)  
**Date drafted:** 2026-05-03  
**Status:** Ready for implementation

---

## 1. Feature Overview

Five interrelated features that give the admin team full operational visibility and control over the platform's core activity loop.

| # | Feature | Core Gap Closed |
|---|---|---|
| 1 | Review curation | Currently only hide/restore; no reason, no text edit, no bulk actions |
| 2 | User-centric booking view | No way to see all bookings for a specific user in one place |
| 3 | Booking detail — status, time, full log | Status is read-only in admin; no reschedule; no timeline view |
| 4 | Payment confirmation view | Payment status visible but fragmented; no per-booking payment story |
| 5 | WhatsApp link tracking | Zero tracking today — no click data anywhere in the codebase |

---

## 2. Current State Inventory

### What already exists

**Bookings (`/admin/bookings/bookings-client.tsx`):**
- Table with columns: ID, status badge, payment badge, service·model, user, technician, date, prices, paymentId
- Actions: cancel (restricted), refund (for paid), open payment link, view detail (links to public `/booking/[id]`)
- Search: free text across names/IDs; dropdown filter for status and payment status
- Missing: edit status, edit date, booking notes, full interaction log, WhatsApp tracking column

**Reviews (`/admin/reviews/reviews-client.tsx`):**
- Cards with comment, rating, reply, visibility badge
- Actions: toggle hide/restore
- Missing: moderation reason, text edit, bulk actions, rating recompute on hide

**Audit log (`src/lib/db/audit-log.ts`):**
- Already logs: `booking_status_updated`, `admin_booking_cancelled`, `review_hidden`, `review_restored`
- Each entry: `{ action, actorUid, targetType, targetId, metadata, createdAt }`
- No WhatsApp events logged anywhere

**Types (`Booking`):**
- `notes: string | null` — exists but not shown in admin UI
- `reminderSentAt: string | null` — exists
- `disclaimerAcceptedAt` — exists
- No `whatsappClickedAt`, no `whatsappClickCount`

### What does NOT exist

- `/admin/bookings/[id]` — booking detail page for admin
- `/admin/users/[id]` — user detail page with their bookings
- WhatsApp click tracking of any kind
- Booking reschedule capability
- Review text editing
- Moderation reason on reviews
- Rating recalculation when review is hidden/restored

---

## 3. Data Model Changes

### 3.1 Booking — add WhatsApp tracking fields

```typescript
// src/types/index.ts — add to Booking interface
interface Booking {
  // ... all existing fields ...
  whatsappClickedAt: string | null   // ISO timestamp of first click
  whatsappClickCount: number         // total click count (incremented on each click)
  statusHistory: BookingStatusEvent[] // denormalized log of status transitions
}

interface BookingStatusEvent {
  status: BookingStatus
  previousStatus: BookingStatus | null
  changedAt: string     // ISO timestamp
  changedBy: string     // UID
  changedByRole: "user" | "technician" | "admin" | "system"
  reason: string | null
}
```

> **Why `statusHistory` on the booking doc?** Embedding the last N status events on the booking itself avoids an extra Firestore read every time the admin opens a booking detail. The canonical source for moderation events is still the `auditLog` collection — this is a denormalized convenience field capped at 50 entries.

> **Why `whatsappClickCount` instead of just `whatsappClickedAt`?** Repeated contacts are meaningful signal — a technician who is contacted 5 times may be unresponsive; the admin should see that.

### 3.2 Review — add moderation reason

```typescript
// src/types/index.ts — add to Review interface
interface Review {
  // ... all existing fields ...
  moderationReason: string | null     // why admin hid/edited this review
  originalComment: string | null      // preserved copy when admin edits comment text
  adminEditedAt: string | null        // timestamp of last admin text edit
  adminEditedBy: string | null        // UID of admin who edited
}
```

### 3.3 Firestore writes summary

| Collection | New Fields | Written By |
|---|---|---|
| `bookings/{id}` | `whatsappClickedAt`, `whatsappClickCount`, `statusHistory` | Track endpoint, status update routes |
| `reviews/{id}` | `moderationReason`, `originalComment`, `adminEditedAt`, `adminEditedBy` | Admin review PATCH route |

No new collections needed. The `auditLog` collection already exists and absorbs all new event types.

---

## 4. Feature 1 — Review Curation

### 4.1 What changes

| Current behavior | New behavior |
|---|---|
| Hide/restore only | Hide/restore + optional reason text + edit comment text |
| No reason recorded | `moderationReason` saved on hide/edit |
| Rating unchanged when hidden | Rating recalculated when hide/restore toggled |
| Single action per card | Bulk select + bulk hide |
| No edit capability | Admin can edit comment text (original preserved) |

### 4.2 API — extend `PATCH /api/admin/reviews`

**Extend request schema (`src/app/api/admin/reviews/route.ts`):**

```typescript
// New Zod schema
const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("set_visibility"),
    id: z.string(),
    isHidden: z.boolean(),
    reason: z.string().max(500).nullable().optional(),
  }),
  z.object({
    action: z.literal("edit_comment"),
    id: z.string(),
    comment: z.string().min(10).max(1000),
    reason: z.string().min(5).max(500),  // required for edit — admin must explain why
  }),
  z.object({
    action: z.literal("bulk_set_visibility"),
    ids: z.array(z.string()).min(1).max(50),
    isHidden: z.boolean(),
    reason: z.string().max(500).nullable().optional(),
  }),
])
```

**Handler logic for each action:**

```
action: "set_visibility"
  1. setReviewHidden(id, isHidden, adminUid)        ← existing function
  2. If reason provided: write moderationReason to review doc
  3. recalculateTechnicianRating(review.technicianId) ← NEW function (see 4.3)
  4. auditLog("review_hidden" | "review_restored", adminUid, "review", id, { reason })

action: "edit_comment"
  1. Read current review → store comment as originalComment (only if not already stored)
  2. Write new comment + adminEditedAt + adminEditedBy + moderationReason
  3. auditLog("review_comment_edited", adminUid, "review", id, { reason, originalLength: original.length })
  4. NOTE: do NOT change isHidden — editing is separate from hiding

action: "bulk_set_visibility"
  1. Batch read all review docs
  2. For each: setReviewHidden(id, isHidden, adminUid) + save reason
  3. Collect unique technicianIds → recalculate each rating once
  4. auditLog one entry per review (or one bulk entry with metadata.ids)
```

### 4.3 New DB function — `recalculateTechnicianRating`

File: `src/lib/db/reviews.ts`

```typescript
export async function recalculateTechnicianRating(technicianId: string): Promise<void> {
  // Fetch all non-hidden reviews for this technician
  const reviews = await getReviewsByTechnician(technicianId, 1000, { includeHidden: false })
  const count = reviews.length
  const avg = count === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / count

  await db.collection("technicians").doc(technicianId).update({
    rating: Math.round(avg * 10) / 10,  // 1 decimal place
    reviewCount: count,
    updatedAt: new Date().toISOString(),
  })
}
```

> Call this after every hide/restore and after every new review creation (replace current inline rating math with a call to this function).

### 4.4 UI — update `reviews-client.tsx`

**New UI elements:**

1. **Bulk selection** — checkbox column on each card; "Seleccionar todo" header checkbox
2. **Bulk action bar** — appears when ≥1 review selected: `[Ocultar seleccionadas]` `[Restaurar seleccionadas]`
3. **Reason modal** — shown on any hide/edit action:
   ```
   ¿Por qué se oculta esta reseña?
   [ Contenido inapropiado  ▾ ]   (dropdown with preset reasons)
   [ texto libre opcional         ]
   [Cancelar]  [Confirmar]
   ```
   Preset reasons: "Contenido inapropiado", "Spam", "Información falsa", "Solicitud del usuario", "Error del sistema", "Otro"

4. **Edit comment button** — new action on each card (pencil icon), opens inline edit:
   ```
   Editar comentario (reseña de Juan → Técnico Carlos)
   [textarea with current comment text]
   Razón: [required text field]
   [Cancelar]  [Guardar cambios]
   ```
   After save, card shows "Editada por admin · {date}" badge in amber.

5. **Original comment toggle** — if `originalComment` is set, show "(ver original)" link that expands a grayed-out blockquote with the original text.

6. **Moderation reason chip** — if `moderationReason` is set on a hidden review, show it as a small badge under the comment: `🔒 Motivo: Contenido inapropiado`

7. **Rating impact notice** — after hide/restore: toast shows "Calificación de {technicianName} actualizada: ⭐ {newRating} ({newCount} reseñas)"

---

## 5. Feature 2 — User-Centric Booking View

### 5.1 What changes

Today there is a `/admin/users` page that lists all users with basic profile data. There is no way to drill into a specific user and see their full booking history.

**New flow:**
```
/admin/users              → user table (existing)
  → click user row        → /admin/users/[id]  (NEW)
      Shows: profile, roles, account status
      + full booking history table
      + reviews they left
      + audit log for this user
```

### 5.2 New page — `/admin/users/[id]`

File: `src/app/admin/users/[id]/page.tsx` (server component)  
Client: `src/app/admin/users/[id]/user-detail-client.tsx`

**Server component fetches (in parallel):**
```typescript
const [user, bookings, reviews, auditEntries] = await Promise.all([
  getUserById(userId),
  getBookingsByUser(userId),           // already exists
  getReviewsByUser(userId),            // already exists
  getAuditEntries({ actorUid: userId, limit: 100 }),
])
```

**Layout — 3-section page:**

```
┌─────────────────────────────────────────────────────┐
│  ← Volver a usuarios                                 │
│  [Avatar] Juan García                                 │
│  juan@email.com  ·  Rol: Usuario  ·  Desde: Ene 2026 │
│  [Suspender cuenta]  [Cambiar rol]                    │
├─────────────────────────────────────────────────────┤
│  [Reservas (4)] [Reseñas (2)] [Actividad]            │
├─────────────────────────────────────────────────────┤
│  TAB CONTENT                                          │
└─────────────────────────────────────────────────────┘
```

**Tab: Reservas** — booking table (compact version of the booking list):

| Campo | Valor |
|---|---|
| Servicio · Modelo | Actualización firmware · Xiaomi Mi5 |
| Técnico | Carlos Rodríguez |
| Fecha | 12 mar 2026, 10:00 |
| Estado | `confirmed` badge |
| Pago | `paid` badge |
| WhatsApp | ✓ Contactó (15 mar, 09:32) or ✗ No contactó |
| Acciones | [Ver detalle] → `/admin/bookings/[id]` |

**Tab: Reseñas** — compact review list:
- Technician name, rating, comment excerpt, date, visibility badge
- Each card links to `/admin/reviews` filtered to that review

**Tab: Actividad** — audit log entries where `actorUid === userId`:
- Chronological timeline of: bookings created, status changes, payments, WhatsApp clicks, reviews submitted

### 5.3 Update `/admin/users` page (link to detail)

In `src/app/admin/users/users-client.tsx`, make each user row clickable (or add a "Ver detalle" button) that navigates to `/admin/users/[id]`.

Add a "Ver reservas" quick-link badge on the user row showing count: `3 reservas`.

### 5.4 Update `/admin/bookings` — add user filter

In `bookings-client.tsx`, add a "Filtrar por usuario" input that accepts a user display name or email. When active, shows only that user's bookings. This allows reaching the same filtered view from the booking list direction.

---

## 6. Feature 3 — Booking Detail Page (Admin)

This is the most complex feature. It creates a dedicated admin view for a single booking with full management capabilities.

### 6.1 New page — `/admin/bookings/[id]`

File: `src/app/admin/bookings/[id]/page.tsx` (server component)  
Client: `src/app/admin/bookings/[id]/booking-detail-client.tsx`

**Server component fetches:**
```typescript
const [booking, user, technician, service, model, review, auditEntries] = await Promise.all([
  getBookingById(id),
  getUserById(booking.userId),
  getTechnicianById(booking.technicianId),
  getServiceById(booking.serviceId),
  getModelById(booking.scooterModelId),
  getReviewByBooking(id),
  getAuditEntries({ targetType: "booking", targetId: id, limit: 100 }),
])
```

**Layout — two-column on desktop, single-column on mobile:**

```
┌─────────────────────────────────────────────────────────┐
│  ← Volver a reservas         Reserva #ABC123             │
│  ─────────────────────────────────────────────────────── │
│  LEFT COLUMN (60%)           RIGHT COLUMN (40%)          │
│  ─────────────────────────── ──────────────────────────  │
│  Resumen de la reserva        Estado & Acciones           │
│  Detalles del pago            Timeline de interacciones   │
│  Reseña del usuario                                       │
└─────────────────────────────────────────────────────────┘
```

---

### 6.2 Left column — Booking summary card

```
Servicio:      Desbloqueo de velocidad
Modelo:        Xiaomi Mi5 Gen 3  [imagen miniatura]
Usuario:       Juan García  [→ /admin/users/juan-uid]
Técnico:       Carlos Rodríguez  [→ /admin/technicians/carlos-id]
Fecha agendada: Martes 12 mar 2026, 10:00
Notas:         "Tengo el manual del scooter"
Disclaimer:    Aceptado el 10 mar 2026 (v1.0)
Creada:        10 mar 2026, 14:23
Última actualizacion: 12 mar 2026, 15:01
```

**Edit booking date** — inline editor triggered by a pencil icon next to "Fecha agendada":

```
Cambiar fecha y hora
[date picker] [time picker — slots from technician availability]
Razón: [text input, required]
[Cancelar]  [Guardar]
```

When saved:
1. Validate new date is in the future
2. Validate technician is available at new time (call `buildHourSlots` check)
3. `updateBookingScheduledDate(id, newDate, adminUid, reason)` — new DB function
4. Append to `statusHistory`: `{ status: currentStatus, previousStatus: currentStatus, changedAt, changedBy, changedByRole: "admin", reason: "Reagendado: {reason}" }`
5. Audit log: `"booking_rescheduled"` with metadata `{ oldDate, newDate, reason }`
6. Send reschedule notification to user (reuse existing notification system)

**Edit booking notes** — inline textarea for the `notes` field:
- Admin can add/edit notes (separate from user's original notes)
- Add `adminNotes: string | null` field to Booking type for this purpose
- Clearly labeled "Notas del admin" vs "Notas del usuario" in the UI

---

### 6.3 Left column — Payment detail card

```
┌───────────────────────────────────────────────────┐
│  💳 Pago                                           │
│                                                     │
│  Estado:       [PAGADO ✓]  badge                   │
│  Total:        $2.200 UYU                           │
│  Base:         $2.000 UYU (técnico)                 │
│  Comisión:     $200 UYU (plataforma)                │
│  Pagado el:    12 mar 2026, 09:58                   │  ← from audit log timestamp of payment webhook
│                                                     │
│  ID de pago:   12345678 [copiar]                    │
│  Link MP:      [Abrir en MercadoPago ↗]            │  ← paymentLinkUrl
│                                                     │
│  [Reembolsar pago]  ← visible only if paid          │
└───────────────────────────────────────────────────┘
```

Additional webhook event history (fetched from audit log):

```
Historial de pagos:
  12 mar, 09:55  Preferencia MP creada  (ref: MP-XXXX)
  12 mar, 09:58  Pago recibido  (status: approved)
  12 mar, 09:58  Reserva confirmada automáticamente
```

These come from existing audit log entries with `action: "payment_webhook_received"` filtered by `targetId: bookingId`.

**If `paymentStatus === "pending"`:**
```
Estado:  [PENDIENTE]
Link:    [Ver link de pago ↗]  ← paymentLinkUrl
         Generado el: 12 mar 2026, 09:55
```

**If `paymentStatus === "refunded"`:**
```
Estado:  [REEMBOLSADO]
Reembolsado el: 13 mar 2026, 10:00
```

---

### 6.4 Left column — Review card (if exists)

```
┌─────────────────────────────────────────────────┐
│  ⭐ Reseña del usuario                           │
│                                                   │
│  ★★★★☆  4/5                                      │
│  "Muy buen servicio, el técnico fue puntual..."  │
│  Dejada el: 14 mar 2026                          │
│                                                   │
│  Respuesta del técnico:                          │
│  "Gracias por confiar en nosotros!"              │
│                                                   │
│  Visible: Sí  [Ocultar reseña]  [Ir a reseña]   │
└─────────────────────────────────────────────────┘
```

If no review exists yet:
```
Sin reseña  (el usuario aún no ha dejado comentarios)
```

---

### 6.5 Right column — Status & Actions card

**Current status display:**

```
Estado actual: [EN PROGRESO]  ▸  Desde: 12 mar 10:00
```

**Edit status — dropdown + reason:**

```
Cambiar estado:
  [Seleccionar nuevo estado  ▾]
  
  Razones habituales:
  ○ El técnico confirmó la cita
  ○ El trabajo está en progreso
  ○ El trabajo fue completado
  ○ El usuario canceló
  ○ El técnico canceló
  ○ Otro: [texto libre]
  
  [Cancelar]  [Actualizar estado]
```

The dropdown only shows **valid transitions** from the current status (reuse `canTransitionBookingStatus` with `"admin"` role — admin can move to any state):

```typescript
const ADMIN_VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending:                   ["confirmed", "cancelled_by_user", "cancelled_by_technician", "expired"],
  confirmed:                 ["in_progress", "cancelled_by_user", "cancelled_by_technician"],
  in_progress:               ["completed", "cancelled_by_technician"],
  completed:                 [],             // terminal
  cancelled_by_user:         [],             // terminal
  cancelled_by_technician:   [],             // terminal
  expired:                   [],             // terminal
}
```

**API call on save:**  
`PATCH /api/admin/bookings/[id]` with `{ action: "update_status", status, reason }` (new admin-specific endpoint, see section 8).

---

### 6.6 Right column — Interaction Timeline

This is the central "full log" panel. It surfaces a unified, human-readable chronological list of every tracked event on this booking.

**Sources combined:**
1. `auditLog` entries where `targetId === bookingId`
2. `booking.statusHistory` array (denormalized events)
3. WhatsApp click: `booking.whatsappClickedAt` + `booking.whatsappClickCount`
4. `booking.reminderSentAt`
5. `booking.disclaimerAcceptedAt`

**Rendered as a vertical timeline:**

```
Timeline de interacciones

  🕐 10 mar 2026, 14:23  Reserva creada
     Usuario: Juan García

  🕐 10 mar 2026, 14:25  Preferencia de pago generada
     ID: MP-PREF-XXXX

  🕐 10 mar 2026, 14:23  Disclaimer aceptado
     Versión 1.0

  ✅ 12 mar 2026, 09:58  Pago recibido
     ID: 12345678  ·  $2.200 UYU

  ✅ 12 mar 2026, 09:58  Estado → Confirmado
     Por: sistema (pago recibido)

  💬 12 mar 2026, 10:15  Usuario abrió WhatsApp
     +598 91 234 567 (Carlos Rodríguez)  ·  1 vez

  🔔 12 mar 2026, 09:00  Recordatorio enviado
     Por: sistema

  🔄 12 mar 2026, 10:00  Estado → En progreso
     Por: técnico Carlos Rodríguez

  ✅ 12 mar 2026, 12:30  Estado → Completado
     Por: técnico Carlos Rodríguez

  ⭐ 14 mar 2026, 09:00  Reseña dejada
     4/5 — "Muy buen servicio..."  [Ver reseña]
```

**Event type → icon mapping:**

| Event | Icon | Color |
|---|---|---|
| created | 📋 | neutral |
| disclaimer_accepted | 📄 | neutral |
| payment_link_created | 💳 | neutral |
| payment_received | ✅ | green |
| status_→_confirmed | ✅ | green |
| status_→_in_progress | 🔄 | blue |
| status_→_completed | ✅ | green |
| status_→_cancelled_* | ❌ | red |
| status_→_expired | ⏰ | amber |
| whatsapp_opened | 💬 | teal |
| reminder_sent | 🔔 | neutral |
| review_created | ⭐ | yellow |
| rescheduled | 📅 | blue |
| refunded | 💰 | orange |

If the timeline is empty or only has creation: show "Sin actividad registrada aún."

---

## 7. Feature 4 — Payment Confirmation View

### 7.1 Clear confirmation status in the booking list

Update `bookings-client.tsx` to add a "Confirmación" column that aggregates payment + booking status into a single human-readable state:

```typescript
type BookingConfirmationState =
  | "pending_payment"        // paymentStatus: pending, status: pending
  | "paid_and_confirmed"     // paymentStatus: paid, status: confirmed | in_progress | completed
  | "paid_not_confirmed"     // paymentStatus: paid, status: pending (webhook received but not transitioned — edge case)
  | "cancelled_refunded"     // status: cancelled_*, paymentStatus: refunded
  | "cancelled_not_refunded" // status: cancelled_*, paymentStatus: paid (needs admin attention)
  | "free_confirmed"         // paymentStatus: pending, status: confirmed (free service or manual confirmation)

function getConfirmationState(booking: Booking): BookingConfirmationState { ... }
```

**UI badge for each state:**

| State | Badge | Color |
|---|---|---|
| `pending_payment` | Pago pendiente | gray |
| `paid_and_confirmed` | Pagado y confirmado | green |
| `paid_not_confirmed` | ⚠️ Pagado sin confirmar | amber |
| `cancelled_refunded` | Cancelado · Reembolsado | neutral |
| `cancelled_not_refunded` | ⚠️ Cancelado sin reembolsar | red |
| `free_confirmed` | Confirmado (sin pago) | blue |

The `paid_not_confirmed` and `cancelled_not_refunded` states represent real operational problems — the booking list should allow filtering for them, and the admin overview dashboard should show a count alert if either is non-zero.

### 7.2 Payment-specific filters in booking list

Add to the existing filter bar:
- **"Pagado sin confirmar"** quick filter (shows `paid_not_confirmed` cases)
- **"Cancelado sin reembolsar"** quick filter (shows `cancelled_not_refunded` cases)

### 7.3 Admin overview — payment health KPIs

Add two new KPI cards to `src/app/admin/page.tsx`:

```
Pagados sin confirmar:  [2]  ⚠️  [Ver reservas →]
Cancelados sin reembolsar: [1]  ⚠️  [Ver reservas →]
```

These are derived server-side in the admin page's `getData()` function by filtering `getAllBookings()`.

---

## 8. Feature 5 — WhatsApp Link Tracking

### 8.1 Mechanism

WhatsApp links (`https://wa.me/598XXXXXXXX?text=...`) currently go directly to WhatsApp. To track clicks, route them through a server-side redirect endpoint.

**Architecture:**

```
User clicks "Contactar por WhatsApp" button
  ↓
navigates to GET /api/track/whatsapp?bookingId=X&technicianId=Y
  ↓
Server:
  1. Auth check: must be logged in (not a public tracking pixel)
  2. Atomically increment booking.whatsappClickCount
  3. If first click: set booking.whatsappClickedAt = now()
  4. Write audit log: { action: "whatsapp_opened", actorUid: userId, targetType: "booking", targetId: bookingId, metadata: { technicianId, count: newCount } }
  5. 302 Redirect to: https://wa.me/{technicianWhatsappNumber}?text={encodedMessage}
```

**File:** `src/app/api/track/whatsapp/route.ts`

```typescript
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const bookingId = searchParams.get("bookingId")
  const technicianId = searchParams.get("technicianId")

  // 1. Validate params
  if (!bookingId || !technicianId) {
    return NextResponse.redirect("https://wa.me")  // fallback to WhatsApp home
  }

  // 2. Auth — optional but recommended (log who clicked)
  const session = await getSession(req)

  // 3. Fetch booking + technician in parallel
  const [booking, technician] = await Promise.all([
    getBookingById(bookingId),
    getTechnicianById(technicianId),
  ])

  if (!booking || !technician) {
    return NextResponse.redirect("https://wa.me")
  }

  // 4. Update booking atomically (Firestore transaction)
  await db.runTransaction(async (tx) => {
    const ref = db.collection("bookings").doc(bookingId)
    const doc = await tx.get(ref)
    const data = doc.data()
    const newCount = (data?.whatsappClickCount ?? 0) + 1
    tx.update(ref, {
      whatsappClickCount: newCount,
      whatsappClickedAt: data?.whatsappClickedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  })

  // 5. Audit log
  await addAuditLogEntry({
    action: "whatsapp_opened",
    actorUid: session?.uid ?? null,
    targetType: "booking",
    targetId: bookingId,
    metadata: { technicianId, whatsappNumber: technician.whatsappNumber },
  })

  // 6. Build WhatsApp URL
  const message = encodeURIComponent(
    `Hola, soy ${session?.displayName ?? "un cliente"} y tengo una reserva en ScooterBooster (ID: ${bookingId}). Me comunico para coordinar.`
  )
  const whatsappUrl = `https://wa.me/${technician.whatsappNumber}?text=${message}`

  return NextResponse.redirect(whatsappUrl)
}
```

**Performance note:** The Firestore transaction adds ~100ms latency before the redirect. This is acceptable — WhatsApp's own redirect chain adds more. Do not skip the transaction for a fast redirect; the tracking is the point.

### 8.2 Update all WhatsApp links in the UI

Every place that currently renders a `wa.me` link must be updated. These are the surfaces:

| File | Current | Update to |
|---|---|---|
| `src/app/(main)/booking/[id]/booking-detail-client.tsx` | `href="https://wa.me/..."` | `href="/api/track/whatsapp?bookingId={id}&technicianId={techId}"` |
| `src/app/dashboard/page.tsx` (user dashboard bookings) | `href="https://wa.me/..."` | same pattern |
| `src/components/technician-card.tsx` | `href="https://wa.me/..."` | Only track if inside booking context; from public listing, no bookingId is available — keep direct link |
| `src/app/(main)/technicians/[id]/page.tsx` (public profile) | `href="https://wa.me/..."` | Keep direct — no booking context |
| `src/app/dashboard/technician/bookings/page.tsx` | Technician contacts user | Different flow — technician-to-user, not user-to-technician; no tracking needed |

> **Rule:** Only route through `/api/track/whatsapp` when there is a `bookingId` in context. From public pages (technician listing, technician profile), keep direct `wa.me` links — we cannot associate the click with a booking.

### 8.3 `whatsapp-button.tsx` component update

File: `src/components/whatsapp-button.tsx`

Add an optional `bookingId` prop:

```typescript
interface WhatsAppButtonProps {
  technicianId: string
  whatsappNumber: string
  bookingId?: string        // if provided → tracked redirect; if absent → direct link
  label?: string
  variant?: "button" | "icon"
}

// href logic
const href = bookingId
  ? `/api/track/whatsapp?bookingId=${bookingId}&technicianId=${technicianId}`
  : `https://wa.me/${whatsappNumber}`
```

Pass `bookingId` in booking-context surfaces; omit it on public listing pages.

### 8.4 Admin visibility of WhatsApp tracking

**In booking list (`bookings-client.tsx`):**

Add a "WhatsApp" column:

| Icon | Meaning |
|---|---|
| `💬 ×3` | Opened 3 times — last: 12 mar |
| `💬 ×1` | Opened once |
| `—` | Not opened |

**In booking detail page (right column, timeline):**

Already covered in section 6.6 — WhatsApp click appears as a timeline event.

**In user detail page (`/admin/users/[id]`):**

In the Reservas tab, the WhatsApp column shows whether the user contacted the technician for each booking.

---

## 9. New API Endpoints

### 9.1 `GET /api/admin/users/[id]`

Fetch single user with aggregated data for the admin detail page.

```
GET /api/admin/users/[id]
→ {
    data: {
      user: User,
      bookings: Booking[],
      reviews: Review[],
      auditEntries: AuditLogEntry[],
    }
  }
```

### 9.2 `PATCH /api/admin/bookings/[id]`

New admin-specific booking mutation endpoint (distinct from the existing `/api/bookings/[id]` which is user/technician-facing).

```typescript
// Zod schema
const adminBookingPatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_status"),
    status: z.enum(["pending","confirmed","in_progress","completed",
                    "cancelled_by_user","cancelled_by_technician","expired"]),
    reason: z.string().min(3).max(500),
  }),
  z.object({
    action: z.literal("reschedule"),
    scheduledDate: z.string().datetime(),
    reason: z.string().min(3).max(500),
  }),
  z.object({
    action: z.literal("update_admin_notes"),
    adminNotes: z.string().max(1000),
  }),
])
```

**Handler logic:**

```
action: "update_status"
  1. Validate admin session
  2. Read current booking
  3. Check valid transition (admin can go anywhere except into terminal states)
  4. updateBookingStatus(id, newStatus)
  5. Append to statusHistory
  6. auditLog("booking_status_updated", adminUid, "booking", id, { previousStatus, newStatus, reason, changedByRole: "admin" })
  7. Send user notification if status is now confirmed/completed/cancelled
  8. Return updated booking

action: "reschedule"
  1. Validate new date is in the future
  2. Build technician hour slots for new date — check availability
  3. Write new scheduledDate to Firestore
  4. Append to statusHistory: { reason: "Reagendado: {reason}" }
  5. auditLog("booking_rescheduled", adminUid, "booking", id, { oldDate, newDate, reason })
  6. Send reschedule notification to user + technician
  7. Return updated booking

action: "update_admin_notes"
  1. Write adminNotes field
  2. auditLog("booking_notes_updated", adminUid, "booking", id, {})
  3. Return updated booking
```

### 9.3 `GET /api/track/whatsapp`

Covered in full in section 8.1.

### 9.4 `GET /api/admin/bookings/[id]`

Admin-specific booking fetch that returns the full booking document including all related entities in one round-trip (vs. the public `/api/bookings/[id]` which is user-scoped).

```
GET /api/admin/bookings/[id]
→ {
    data: {
      booking: Booking,
      user: User,
      technician: Technician,
      service: Service,
      model: ScooterModel,
      review: Review | null,
      auditEntries: AuditLogEntry[],  // filtered to this booking
    }
  }
```

---

## 10. Database Function Additions

### `src/lib/db/bookings.ts`

```typescript
// Update scheduled date (admin reschedule)
export async function updateBookingScheduledDate(
  id: string, scheduledDate: string
): Promise<void>

// Append to status history (used by status update + reschedule)
export async function appendBookingStatusEvent(
  id: string, event: BookingStatusEvent
): Promise<void>

// Update admin notes
export async function updateBookingAdminNotes(
  id: string, adminNotes: string
): Promise<void>

// Track WhatsApp click (atomic increment)
export async function recordWhatsAppClick(id: string): Promise<number>
// Returns new click count

// Query: get all bookings with unresolved payment issues
export async function getBookingsWithPaymentIssues(): Promise<Booking[]>
// Returns: paid+pending (not confirmed) + paid+cancelled (not refunded)
```

### `src/lib/db/reviews.ts`

```typescript
// Edit review text (admin)
export async function editReviewComment(
  reviewId: string,
  newComment: string,
  adminUid: string,
  reason: string
): Promise<void>
// Preserves originalComment, writes adminEditedAt, adminEditedBy, moderationReason

// Recalculate + sync technician rating
export async function recalculateTechnicianRating(technicianId: string): Promise<void>

// Bulk set visibility
export async function bulkSetReviewsHidden(
  reviewIds: string[],
  isHidden: boolean,
  adminUid: string,
  reason?: string
): Promise<void>
```

### `src/lib/db/audit-log.ts`

```typescript
// Existing function extended with new filter
export async function getAuditEntries(filters: {
  targetType?: string
  targetId?: string     // NEW — filter by specific booking/review/user ID
  actorUid?: string
  action?: string
  limit?: number
  after?: string        // ISO timestamp — for pagination
}): Promise<AuditLogEntry[]>
```

---

## 11. New Files to Create

```
src/
├── app/
│   ├── admin/
│   │   ├── users/
│   │   │   └── [id]/
│   │   │       ├── page.tsx                     # User detail — server component
│   │   │       └── user-detail-client.tsx        # Tabs: bookings, reviews, activity
│   │   └── bookings/
│   │       └── [id]/
│   │           ├── page.tsx                     # Admin booking detail — server component
│   │           └── booking-detail-client.tsx     # Status editor, timeline, payment card
│   └── api/
│       ├── admin/
│       │   ├── bookings/
│       │   │   └── [id]/
│       │   │       └── route.ts                 # PATCH: update_status, reschedule, notes
│       │   └── users/
│       │       └── [id]/
│       │           └── route.ts                 # GET: user + bookings + reviews + audit
│       └── track/
│           └── whatsapp/
│               └── route.ts                     # GET: track + redirect
├── components/
│   └── booking-timeline.tsx                     # Reusable timeline component
```

---

## 12. Files to Modify

| File | Change |
|---|---|
| `src/types/index.ts` | Add `whatsappClickedAt`, `whatsappClickCount`, `statusHistory`, `adminNotes` to `Booking`; add `moderationReason`, `originalComment`, `adminEditedAt`, `adminEditedBy` to `Review`; add `BookingStatusEvent` interface |
| `src/lib/db/bookings.ts` | Add 5 new functions (see section 10) |
| `src/lib/db/reviews.ts` | Add `editReviewComment`, `recalculateTechnicianRating`, `bulkSetReviewsHidden`; update `createReview` to call `recalculateTechnicianRating` |
| `src/lib/db/audit-log.ts` | Extend `getAuditEntries` with `targetId` filter |
| `src/app/admin/reviews/reviews-client.tsx` | Add bulk select, reason modal, edit comment, original comment toggle, moderation reason chip |
| `src/app/admin/bookings/bookings-client.tsx` | Add confirmation state column, WhatsApp column, user filter, payment-issue quick filters; "Ver detalle" now links to `/admin/bookings/[id]` |
| `src/app/admin/page.tsx` | Add payment health KPI cards (paid-not-confirmed, cancelled-not-refunded) |
| `src/app/api/admin/reviews/route.ts` | Add `edit_comment` and `bulk_set_visibility` actions |
| `src/components/whatsapp-button.tsx` | Add `bookingId` prop; conditional tracked vs direct URL |
| `src/app/(main)/booking/[id]/booking-detail-client.tsx` | Pass `bookingId` to `WhatsAppButton` |
| `src/app/dashboard/page.tsx` | Pass `bookingId` to `WhatsAppButton` on each booking card |
| `src/app/admin/users/users-client.tsx` | Make rows clickable; add booking count badge |
| `firestore.rules` | Allow writes to new `whatsappClickedAt`, `whatsappClickCount` fields from server-side only |

---

## 13. Implementation Order

Execute in this sequence to avoid breaking running code:

1. **Types** — Add all new fields to `src/types/index.ts`. No runtime impact.

2. **DB functions** — Add new functions to `bookings.ts`, `reviews.ts`, `audit-log.ts`. Pure additions.

3. **WhatsApp tracking endpoint** — `src/app/api/track/whatsapp/route.ts`. New endpoint, no existing code touched yet.

4. **Update `WhatsAppButton`** — Add `bookingId` prop; default behavior unchanged when prop absent.

5. **Wire `bookingId` into booking-context surfaces** — Pass `bookingId` to `WhatsAppButton` in `booking-detail-client.tsx` and user dashboard.

6. **Review curation extensions** — `editReviewComment`, `bulkSetReviewsHidden`, `recalculateTechnicianRating` in DB layer + extend admin reviews API + update reviews UI.

7. **Admin booking list** — Add confirmation state column, WhatsApp column, new filters to `bookings-client.tsx`.

8. **Admin booking detail page** — New `/admin/bookings/[id]` with status editor, reschedule, timeline, payment card.

9. **User detail page** — New `/admin/users/[id]` with booking table and activity tab. Update users list to link to it.

10. **Admin overview KPIs** — Add payment health cards to `/admin/page.tsx`.

---

## 14. Acceptance Criteria

### Review curation
- [ ] Admin can hide a review and provide a reason (free text or preset)
- [ ] Admin can restore a hidden review
- [ ] Moderation reason is displayed on hidden review cards in admin panel
- [ ] Admin can edit a review's comment text; original text is preserved and viewable
- [ ] After hide/restore, the technician's average rating and review count are recalculated
- [ ] Admin can select multiple reviews and bulk hide/restore with a shared reason
- [ ] Edited reviews show "Editada por admin · {date}" badge

### User booking view
- [ ] Clicking a user row in `/admin/users` navigates to `/admin/users/[id]`
- [ ] User detail page shows all their bookings in a table
- [ ] Each booking row shows: service, model, technician, date, status, payment, WhatsApp contact status
- [ ] "Ver detalle" on each booking links to `/admin/bookings/[id]`
- [ ] User detail page shows reviews the user has left
- [ ] User detail page shows an activity log (audit entries for this user)

### Booking detail management
- [ ] `/admin/bookings/[id]` shows booking summary, payment detail, review, status editor, and timeline
- [ ] Admin can change booking status; dropdown only shows valid transitions; reason is required
- [ ] Status change is recorded in `statusHistory` and audit log
- [ ] Admin can reschedule a booking; new date is validated against technician availability
- [ ] Reschedule triggers user notification and is recorded in timeline
- [ ] Admin can add/edit internal notes on a booking
- [ ] Timeline shows all events: created, disclaimer, payment, WhatsApp clicks, status changes, reminder, review

### Payment visibility
- [ ] Booking list shows a "confirmation state" column with aggregated payment + status badge
- [ ] "Pagado sin confirmar" and "Cancelado sin reembolsar" quick filters are available in booking list
- [ ] Admin overview dashboard shows count of payment-issue bookings with warning badge and link
- [ ] Booking detail payment card shows: total, base, fee, paymentId, link to MP, refund button

### WhatsApp tracking
- [ ] Clicking "Contactar por WhatsApp" on a booking detail page goes through `/api/track/whatsapp?bookingId=X`
- [ ] The endpoint increments `whatsappClickCount` and sets `whatsappClickedAt` on first click
- [ ] An audit log entry `"whatsapp_opened"` is created on each click
- [ ] The endpoint redirects to the correct `wa.me` URL with a pre-filled message
- [ ] Booking list shows WhatsApp click count and date in the WhatsApp column
- [ ] Timeline in booking detail shows "Usuario abrió WhatsApp · N veces" event
- [ ] WhatsApp links on public pages (technician listing, technician profile) remain direct `wa.me` links — NOT routed through tracking

---

## 15. Edge Cases

| Case | Handling |
|---|---|
| Admin hides a review with 5 stars from a technician with only 1 review | Rating drops to 0 and reviewCount drops to 0 — technician effectively unrated. Consider showing "Sin calificación" instead of "0.0" |
| User clicks WhatsApp 10 times | Count increments each time; admin sees `×10`. No cap needed — this is useful signal |
| WhatsApp tracking endpoint called without auth | Log click with `actorUid: null`, still redirect. Rate limit this endpoint (5 req/min) to prevent artificial inflation |
| Booking is rescheduled to a time technician is now unavailable | Validate against live availability at time of reschedule, not at booking creation time. Return `409` with helpful message if no slots available |
| Admin edits a review comment that was already edited | `originalComment` is only written on first edit — subsequent edits replace `comment` but preserve the first original |
| Booking has no MercadoPago data (zero-price service or manual booking) | Payment detail card shows "Sin pago requerido" instead of blank fields |
| User cancels booking after WhatsApp was already opened | Timeline shows both events — WhatsApp contact before cancellation is historically accurate and useful for dispute resolution |
| `getAuditEntries({ targetId: bookingId })` returns 0 entries (old bookings pre-audit-log) | Timeline falls back gracefully to just `statusHistory` + booking timestamps |
