# Technician Management V2 — Feature Plan

**Target audience:** Semi-senior LLM agent (Alan)  
**Date drafted:** 2026-05-03  
**Status:** Ready for implementation

---

## 1. Feature Summary

We are expanding technician data from a flat per-service price to a **service × scooter-model pricing matrix**. A technician can charge different prices (or be unavailable) for the same service depending on which scooter model is being serviced.

This touches four areas:

| Area | Change |
|---|---|
| Data model | Add `pricingMatrix` field; deprecate flat `pricing` + `supportedBrands` |
| Admin dashboard | Full CRUD for technicians (create, profile edit, matrix editor, hours editor, delete) |
| Booking wizard Step 3 | Filter technicians by model-level availability; show dynamic "desde $X" price |
| API layer | New admin endpoints; extend existing technician endpoints |

---

## 2. Current State (What Exists)

### Technician pricing today

```typescript
// technicians/{id}
pricing: Record<serviceId, { basePrice: number; currency: "UYU" }>
// e.g. { "speed-limit": { basePrice: 1500, currency: "UYU" } }

services: string[]        // serviceIds they offer
supportedBrands: string[] // brandIds (all models of that brand)
```

**Problem:** One price per service, brand-level granularity. Cannot model "Xiaomi 5 Gen → $1500, Ninebot G2 → $2200, no support for Vsett."

### Booking wizard Step 3 filter today

```typescript
// technicians-client.tsx / booking-wizard.tsx
const match = tech.services.includes(serviceId) &&
              tech.supportedBrands.includes(model.brandId)
```

**Problem:** Does not check model-level availability at all.

---

## 3. New Data Model

### 3.1 `TechnicianModelPricing` — per-entry shape

```typescript
interface TechnicianModelPricing {
  price: number       // in UYU
  currency: "UYU"
  isAvailable: boolean
}
```

### 3.2 `pricingMatrix` — top-level field on `Technician`

```typescript
// Stored on technicians/{id} as a nested Firestore map
pricingMatrix: {
  [serviceId: string]: {
    [modelId: string]: TechnicianModelPricing
  }
}

// Example
pricingMatrix: {
  "speed-limit": {
    "xiaomi-mi5-gen3": { price: 1500, currency: "UYU", isAvailable: true  },
    "ninebot-g2":      { price: 2200, currency: "UYU", isAvailable: true  },
    "vsett-9":         { price: 0,    currency: "UYU", isAvailable: false },
  },
  "firmware-update": {
    "xiaomi-mi5-gen3": { price: 800,  currency: "UYU", isAvailable: true  },
  }
}
```

### 3.3 Updated `Technician` interface

The following fields change status:

| Field | Before | After |
|---|---|---|
| `pricingMatrix` | ❌ (does not exist) | ✅ New primary source |
| `pricing` | Primary | Deprecated — kept for read compat, derived from matrix |
| `supportedBrands` | Used for filtering | Deprecated — derived from matrix (brands of supported models) |
| `services` | Used for filtering | Deprecated — derived from matrix (services with ≥1 available model) |

> **Why keep deprecated fields?** Existing read paths (search, listing, public profile) rely on `services` and `supportedBrands` for Firestore composite index queries. Deriving and syncing them on every write is cheaper than migrating all query paths at once. They become an indexed summary of the matrix.

Add to `src/types/index.ts`:

```typescript
interface TechnicianModelPricing {
  price: number
  currency: "UYU"
  isAvailable: boolean
}

// Updated Technician — add pricingMatrix, mark others as maintained-from-matrix
interface Technician {
  // ... all existing fields unchanged ...
  pricingMatrix: Record<string, Record<string, TechnicianModelPricing>>
  // services, supportedBrands, pricing remain but are now DERIVED on write
}
```

### 3.4 Helper: derive legacy fields from matrix

```typescript
// src/lib/technician-matrix.ts

export function deriveServicesFromMatrix(
  matrix: Technician["pricingMatrix"]
): string[] {
  return Object.entries(matrix)
    .filter(([, models]) => Object.values(models).some(m => m.isAvailable))
    .map(([serviceId]) => serviceId)
}

export function deriveSupportedBrandsFromMatrix(
  matrix: Technician["pricingMatrix"],
  modelBrandMap: Record<string, string>  // modelId -> brandId
): string[] {
  const brandSet = new Set<string>()
  for (const models of Object.values(matrix)) {
    for (const [modelId, entry] of Object.entries(models)) {
      if (entry.isAvailable && modelBrandMap[modelId]) {
        brandSet.add(modelBrandMap[modelId])
      }
    }
  }
  return Array.from(brandSet)
}

export function derivePricingFromMatrix(
  matrix: Technician["pricingMatrix"]
): Record<string, { basePrice: number; currency: "UYU" }> {
  const result: Record<string, { basePrice: number; currency: "UYU" }> = {}
  for (const [serviceId, models] of Object.entries(matrix)) {
    const prices = Object.values(models)
      .filter(m => m.isAvailable && m.price > 0)
      .map(m => m.price)
    if (prices.length > 0) {
      result[serviceId] = { basePrice: Math.min(...prices), currency: "UYU" }
    }
  }
  return result
}

// Find lowest available price for (serviceId, modelId) pair
export function getPriceForBooking(
  matrix: Technician["pricingMatrix"],
  serviceId: string,
  modelId: string
): number | null {
  return matrix[serviceId]?.[modelId]?.isAvailable
    ? (matrix[serviceId][modelId].price ?? null)
    : null
}

// Check if technician supports this specific service × model combination
export function isTechnicianCompatible(
  matrix: Technician["pricingMatrix"],
  serviceId: string,
  modelId: string
): boolean {
  return matrix[serviceId]?.[modelId]?.isAvailable === true
}
```

---

## 4. Firestore Schema Changes

### 4.1 New field on `technicians/{id}`

```
technicians/{id}
  ...existing fields...
  pricingMatrix: map
    {serviceId}: map
      {modelId}: map
        price: number
        currency: string ("UYU")
        isAvailable: boolean
```

No new collections needed. The matrix lives as a nested map on the technician document.

### 4.2 Firestore indexes (no new composite needed)

The existing indexes on `(isApproved, isActive, rating)` still work for listing. Matrix-based filtering happens **client-side or in route handler** after fetching — the matrix is too sparse for a direct Firestore compound query.

> **Why not a subcollection for matrix entries?** For Uruguay scale (dozens of technicians, ~20 models, ~4 services = ≤80 entries per technician), a nested map is simpler, cheaper, and avoids 80-doc reads per technician. Revisit if matrix grows to hundreds of entries.

### 4.3 Firestore security rules addition

```
match /technicians/{techId} {
  // Technician can update their own pricing matrix (after approval)
  allow update: if request.auth.uid == resource.data.userId
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(["pricingMatrix", "pricing", "services", "supportedBrands",
                  "availability", "bio", "location", "phone", "whatsappNumber",
                  "photoURL", "displayName", "isActive", "updatedAt"])

  // Admin can update any field
  allow update: if request.auth.token.role == "admin"
}
```

---

## 5. API Changes

### 5.1 Existing endpoint — extend `PATCH /api/admin/technicians/[id]`

Add `action: "create"` and `action: "delete"` variants. Add `pricingMatrix` and `availability` to the `action: "update"` payload.

**Extended request body:**

```typescript
// action: "create"
{
  action: "create",
  displayName: string,
  bio: string,
  phone: string,
  whatsappNumber: string,
  location: string,
  photoURL?: string,
  pricingMatrix?: Record<string, Record<string, TechnicianModelPricing>>,
  availability?: Record<string, DayAvailability>,
  // email is required to create the Firebase Auth user
  email: string,
}

// action: "update"  (extend existing)
{
  action: "update",
  pricingMatrix?: Record<string, Record<string, TechnicianModelPricing>>,
  availability?: Record<string, DayAvailability>,
  // ... all existing profile fields
}

// action: "delete"
{
  action: "delete",
  // hard delete vs soft delete controlled by admin intent
  hard?: boolean  // default false → soft delete (sets deletedAt)
}
```

**Route handler changes (`src/app/api/admin/technicians/[id]/route.ts`):**

```
case "create":
  1. Validate email uniqueness in Firebase Auth
  2. createUser() in Firebase Auth → get uid
  3. setCustomUserClaims(uid, { role: "technician" })
  4. createTechnicianDoc(uid, payload) — auto-derive services/supportedBrands/pricing from matrix
  5. auditLog("technician_created", adminUid, "technician", techId)
  6. return 201

case "delete":
  1. Check no active bookings (status in ["pending","confirmed","in_progress"])
  2. If hard delete: deleteUser(uid) + delete Firestore doc
  3. If soft delete: set deletedAt, isActive:false, isApproved:false, 
                     disableUser(uid) in Firebase Auth
  4. auditLog("technician_deleted", adminUid, "technician", techId)
  5. return 200

case "update" (extended):
  - If pricingMatrix present: derive + sync services, supportedBrands, pricing
  - If availability present: validate day keys + time format
  - Proceed with existing save logic
```

### 5.2 New endpoint — `GET /api/admin/technicians`

Currently admin fetches all technicians from Firestore client-side in the component. Centralize into a server-side route that also returns full matrix and availability data.

```
GET /api/admin/technicians?status=pending|approved|rejected|all&search=...
→ { data: Technician[], total: number }
```

### 5.3 New endpoint — `POST /api/admin/technicians`

Create a technician (separate route for cleanliness — avoids PATCH-on-nonexistent-id).

```
POST /api/admin/technicians
body: { email, displayName, bio, phone, whatsappNumber, location, ... }
→ { data: { technicianId, userId }, success: true }
```

### 5.4 Technician-facing endpoint — `PATCH /api/technicians/me/pricing-matrix`

Allow technicians to manage their own matrix from the technician dashboard (separate from admin override).

```
PATCH /api/technicians/me/pricing-matrix
body: { pricingMatrix: Record<string, Record<string, TechnicianModelPricing>> }
→ { data: Technician, success: true }

Validation:
- All modelIds must exist in scooterModels collection (server-side check)
- All serviceIds must exist in services collection
- price >= 0
- If isAvailable === false, price is ignored (can be 0)
```

### 5.5 Technician-facing endpoint — `PATCH /api/technicians/me/availability`

Technicians manage their own hours (already partially exists via profile patch — extract into dedicated endpoint for clarity and finer validation).

```
PATCH /api/technicians/me/availability
body: { availability: Record<string, DayAvailability> }

Validation:
- Valid day keys: ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"]
- start/end format: HH:MM (24h)
- start < end when isAvailable: true
```

---

## 6. Admin Dashboard — Full CRUD

### 6.1 Tab structure (update `admin/technicians/technicians-client.tsx`)

Add a fourth tab: **"Crear técnico"** (or a floating `+` button that opens a creation modal).

Current tabs: `Pendientes | Aprobados | Rechazados`  
New tabs: `Pendientes | Aprobados | Rechazados | + Nuevo`

Alternatively — and more scalable — a modal triggered by a button in the page header:

```
[Técnicos]  ________________________  [+ Nuevo técnico]
            search bar
[Pendientes] [Aprobados] [Rechazados]
```

### 6.2 Create Technician Modal (`CreateTechnicianModal`)

File: `src/app/admin/technicians/create-technician-modal.tsx`

**Fields (all required unless noted):**

```
Email*            → used to create Firebase Auth user
Nombre completo*  → displayName
Teléfono*         → +598XXXXXXXX
WhatsApp*         → 598XXXXXXXX
Ubicación*        → city/neighborhood
Bio*              → min 40 chars
Foto URL          → optional, can be added later
```

**Behavior:**
- On submit: `POST /api/admin/technicians`
- On success: close modal, refresh list, show toast "Técnico creado. Pendiente de aprobación."
- Newly created technician starts with `isApproved: false`, `applicationStatus: "pending"`, empty `pricingMatrix`
- Admin must then use the pricing matrix editor to configure services before approving

### 6.3 Edit Panel — 3-tab layout (replace current single right-panel)

When admin clicks on a technician row, open a right-side drawer with **three tabs**:

```
[Perfil] [Servicios & Precios] [Horarios]
```

Each tab saves independently via PATCH. Changes are not lost when switching tabs (use local form state).

---

### 6.4 Tab 1 — Perfil (Profile)

File: `src/app/admin/technicians/tabs/profile-tab.tsx`

This is largely the **existing profile override panel** — refactor it into a dedicated tab component.

Fields:
- Display name
- Bio
- Phone + WhatsApp
- Location
- Photo URL / upload
- Is Active toggle
- Application status actions (Aprobar / Pedir cambios / Rechazar)
- Moderation reason (shown when status changes)

No structural change — just extract from the current sidebar into a tab.

---

### 6.5 Tab 2 — Servicios & Precios (Pricing Matrix Editor)

File: `src/app/admin/technicians/tabs/pricing-matrix-tab.tsx`

This is the **new central feature** of this plan.

#### Layout concept

A 2D grid where rows = services, columns = scooter models:

```
                 [Xiaomi 5 Gen]  [Ninebot G2]  [Vsett 9]  [Segway F25]
─────────────────────────────────────────────────────────────────────
Desbloqueo vel.  [$1500  ✓]     [$2200  ✓]    [  —   ✗]  [$1800  ✓]
Actualiz. firm.  [$800   ✓]     [$800   ✓]    [$800  ✓]  [  —    ✗]
Control crucero  [  —    ✗]     [$600   ✓]    [  —   ✗]  [  —    ✗]
Mantenimiento    [$500   ✓]     [$500   ✓]    [$500  ✓]  [$500   ✓]
```

Each cell is an interactive unit:
- **Checkbox / toggle** — mark the combination as available (✓) or not (✗)
- **Price input** — shown only when the toggle is on; accepts numeric input; shows "$ " prefix
- Cells with `isAvailable: false` are grayed out; price input hidden

#### Data flow

```
On load:
  1. Fetch all active services (GET /api/services or from admin server component)
  2. Fetch all active scooter models grouped by brand (GET /api/scooters/models)
  3. Map current pricingMatrix onto the grid

On cell change:
  Local state update only (no auto-save to avoid spamming API)

On "Guardar cambios" button:
  PATCH /api/admin/technicians/[id]
  body: { action: "update", pricingMatrix: <full matrix from local state> }
  Derived fields (services, supportedBrands, pricing) updated server-side
```

#### UX details

- Models can be grouped by brand with collapsible brand headers
- "Seleccionar todo" / "Limpiar todo" per service row (quick fill for services they offer to all models at one price)
- "Copiar precio a toda la fila" button per row — enters one price and stamps it across all enabled models
- Models not relevant to a service (model.compatibleServices doesn't include it) are shown dimmed with a tooltip "Este modelo no es compatible con este servicio"
- Unsaved changes indicator: "Hay cambios sin guardar" badge on the tab title

#### Component structure

```tsx
<PricingMatrixTab technicianId={id} matrix={pricingMatrix} />
  <PricingMatrixGrid
    services={Service[]}
    models={ScooterModel[]}       // grouped by brand
    matrix={localMatrix}
    onCellChange={(serviceId, modelId, entry) => updateLocalMatrix(...)}
  />
    <MatrixCell
      entry={TechnicianModelPricing | undefined}
      compatible={boolean}         // from model.compatibleServices
      onChange={fn}
    />
  <Button onClick={handleSave}>Guardar cambios</Button>
```

---

### 6.6 Tab 3 — Horarios (Availability Editor)

File: `src/app/admin/technicians/tabs/availability-tab.tsx`

This mirrors the technician's own availability editor but accessible to admin.

#### Layout

Seven rows, one per day of the week:

```
Lunes      [ ✓ Disponible ]   Desde: [09:00]   Hasta: [18:00]
Martes     [ ✓ Disponible ]   Desde: [09:00]   Hasta: [18:00]
Miércoles  [ ✗ No disponible ]
Jueves     [ ✓ Disponible ]   Desde: [10:00]   Hasta: [17:00]
Viernes    [ ✓ Disponible ]   Desde: [09:00]   Hasta: [18:00]
Sábado     [ ✓ Disponible ]   Desde: [09:00]   Hasta: [13:00]
Domingo    [ ✗ No disponible ]
```

#### Inputs

- Toggle per day: `isAvailable`
- Time selects (or `<input type="time">`): `start`, `end`
- When toggled off: time inputs hide with animation
- Validation: `start < end`, must be valid HH:MM

#### Data flow

```
On load: map technician.availability to form state
On save: PATCH /api/admin/technicians/[id] body: { action: "update", availability: {...} }
```

#### Component

```tsx
<AvailabilityTab technicianId={id} availability={availability} />
  {DAYS_OF_WEEK.map(day => (
    <DayAvailabilityRow
      day={day}
      value={localAvailability[day]}
      onChange={fn}
    />
  ))}
  <Button onClick={handleSave}>Guardar horarios</Button>
```

### 6.7 Delete Technician

Accessible via a "Eliminar técnico" button in the Profile tab (admin only, destructive — behind a confirmation dialog).

**Dialog content:**

```
⚠️  ¿Eliminar a {displayName}?
Esta acción desactivará su cuenta. Las reservas activas se mantendrán.
Si tiene reservas pendientes, deberán resolverse antes de proceder.

[Cancelar]    [Eliminar técnico]
```

**Logic:**

1. Client calls `PATCH /api/admin/technicians/[id]` with `{ action: "delete" }`
2. Route checks for active bookings — if any exist, returns `409` with message
3. If clean: soft-delete (set `deletedAt`, `isActive: false`, disable Firebase Auth user)
4. Hard delete available as separate `{ action: "delete", hard: true }` — only if no bookings at all

---

## 7. Technician Dashboard — Self-Service Pricing & Availability

The technician should be able to manage their own matrix and hours from their dashboard (not just through admin). This closes the gap between admin override and self-management.

### 7.1 Pricing Matrix — Technician Dashboard

File: `src/app/dashboard/technician/pricing/page.tsx` (new page)  
Client: `src/app/dashboard/technician/pricing/pricing-client.tsx`

Reuse the same `<PricingMatrixGrid>` component from admin, but:
- Fetches own data via `GET /api/technicians/me` (existing endpoint — returns full technician doc)
- Saves via `PATCH /api/technicians/me/pricing-matrix` (new endpoint)
- No moderation-reason or status-change UI

Add link in technician dashboard sidebar: `Servicios & Precios → /dashboard/technician/pricing`

### 7.2 Availability — Technician Dashboard

File: `src/app/dashboard/technician/availability/page.tsx` (new page)  
Client: `src/app/dashboard/technician/availability/availability-client.tsx`

Reuse the same `<AvailabilityEditor>` component from admin, but:
- Saves via `PATCH /api/technicians/me/availability` (new endpoint)

Add link in technician dashboard sidebar: `Horarios → /dashboard/technician/availability`

> Both pages currently exist implicitly within the profile page. Extract them into dedicated pages and add navigation — the profile page becomes bio/contact-only.

---

## 8. Booking Wizard — Step 3 Update

File: `src/app/(main)/booking/new/booking-wizard.tsx`

### 8.1 New filter logic

Replace the current brand-based filter:

```typescript
// BEFORE
const match = tech.services.includes(serviceId) &&
              tech.supportedBrands.includes(model.brandId)

// AFTER
import { isTechnicianCompatible, getPriceForBooking } from "@/lib/technician-matrix"

const match = isTechnicianCompatible(tech.pricingMatrix, serviceId, scooterModelId)
```

### 8.2 Dynamic pricing display

Each technician card in Step 3 must show the price for the **specific model** selected, not a generic base price.

**In `TechnicianCard` (or the inline card in the wizard):**

```tsx
// Resolve price for this specific booking context
const price = getPriceForBooking(tech.pricingMatrix, serviceId, scooterModelId)

// Display
<span>Desde {price !== null ? formatUYU(price) : "Consultar"}</span>
```

If `price === null` (no matrix entry or not available), the technician should not appear in the filtered list at all — but defensively handle it in the display too.

### 8.3 Price in booking confirmation (Step 5)

When calculating pricing for the booking:

```typescript
// BEFORE: looked up pricing[serviceId].basePrice
// AFTER: look up pricingMatrix[serviceId][scooterModelId].price

const basePrice = getPriceForBooking(
  technician.pricingMatrix,
  serviceId,
  scooterModelId
)

if (basePrice === null) {
  // This should never happen if wizard filtered correctly
  // but guard defensively — abort booking creation
  throw new ValidationError("Servicio no disponible para este modelo")
}
```

Update `calculatePricing()` in `src/lib/booking-rules.ts` to accept `basePrice` as a parameter rather than looking it up internally, so the matrix-resolved price flows through cleanly.

### 8.4 "Desde $X" on technician cards (sort by model-specific price)

The sort-by-price option in `TechnicianSortBar` should sort by `pricingMatrix[serviceId][modelId].price`, not the generic `pricing[serviceId].basePrice`:

```typescript
// In the sort logic for "price" option
const priceA = getPriceForBooking(a.pricingMatrix, serviceId, scooterModelId) ?? Infinity
const priceB = getPriceForBooking(b.pricingMatrix, serviceId, scooterModelId) ?? Infinity
return priceA - priceB
```

---

## 9. Migration Strategy

### 9.1 Seed script update (`scripts/seed.ts`)

Seed new technicians with `pricingMatrix` instead of flat `pricing` + `supportedBrands`:

```typescript
const seedTechnicianMatrix = {
  "speed-limit": {
    "xiaomi-mi5-gen3": { price: 1500, currency: "UYU", isAvailable: true },
    "ninebot-g2":      { price: 2200, currency: "UYU", isAvailable: true },
  },
  "maintenance": {
    "xiaomi-mi5-gen3": { price: 500, currency: "UYU", isAvailable: true },
    "ninebot-g2":      { price: 600, currency: "UYU", isAvailable: true },
  }
}
```

Derive and also write `services`, `supportedBrands`, `pricing` for backward compat.

### 9.2 Existing live technicians (migration script)

File: `scripts/migrate-pricing-matrix.ts`

```
For each existing technician doc:
  1. Read current: services[], supportedBrands[], pricing{}
  2. Build a best-effort pricingMatrix:
     - For each serviceId in services[]:
       - For each brandId in supportedBrands[]:
         - For each modelId in that brand:
           - Set pricingMatrix[serviceId][modelId] = {
               price: pricing[serviceId]?.basePrice ?? 0,
               currency: "UYU",
               isAvailable: true
             }
  3. Write pricingMatrix back to Firestore
  4. Keep old fields unchanged (don't break existing flows until new code is deployed)
```

Run with: `npx ts-node scripts/migrate-pricing-matrix.ts`

### 9.3 Read compatibility

After deploying new code, both paths must work:

```typescript
// In booking wizard — prefer pricingMatrix, fallback to legacy
const hasMatrix = Object.keys(tech.pricingMatrix ?? {}).length > 0

const price = hasMatrix
  ? getPriceForBooking(tech.pricingMatrix, serviceId, modelId)
  : (tech.pricing?.[serviceId]?.basePrice ?? null)

const isCompatible = hasMatrix
  ? isTechnicianCompatible(tech.pricingMatrix, serviceId, modelId)
  : (tech.services?.includes(serviceId) && tech.supportedBrands?.includes(model.brandId))
```

Remove compatibility shim after all technicians have been migrated (verified via admin panel).

---

## 10. New Files to Create

```
src/
├── lib/
│   └── technician-matrix.ts           # Matrix helpers (derives, lookups, compatibility)
├── app/
│   ├── admin/
│   │   └── technicians/
│   │       ├── create-technician-modal.tsx
│   │       └── tabs/
│   │           ├── profile-tab.tsx    # Refactored from current sidebar panel
│   │           ├── pricing-matrix-tab.tsx
│   │           └── availability-tab.tsx
│   ├── dashboard/
│   │   └── technician/
│   │       ├── pricing/
│   │       │   ├── page.tsx
│   │       │   └── pricing-client.tsx
│   │       └── availability/
│   │           ├── page.tsx
│   │           └── availability-client.tsx
│   └── api/
│       ├── admin/
│       │   └── technicians/
│       │       └── route.ts           # New POST for create
│       └── technicians/
│           └── me/
│               ├── pricing-matrix/
│               │   └── route.ts       # New PATCH endpoint
│               └── availability/
│                   └── route.ts       # New PATCH endpoint
├── components/
│   └── pricing-matrix-grid.tsx        # Shared between admin + technician dashboard
scripts/
└── migrate-pricing-matrix.ts          # One-time migration
```

---

## 11. Files to Modify

| File | Change |
|---|---|
| `src/types/index.ts` | Add `TechnicianModelPricing`, add `pricingMatrix` to `Technician` |
| `src/app/admin/technicians/technicians-client.tsx` | Replace sidebar panel with 3-tab drawer; add create button; add delete action |
| `src/app/api/admin/technicians/[id]/route.ts` | Add `create`, `delete` actions; extend `update` to accept matrix + availability |
| `src/app/(main)/booking/new/booking-wizard.tsx` | Update Step 3 filter + price display to use matrix |
| `src/lib/booking-rules.ts` | `calculatePricing()` accepts explicit basePrice param |
| `src/lib/db/technicians.ts` | `createTechnician()`, `updateTechnician()` derive + sync legacy fields from matrix |
| `scripts/seed.ts` | Seed technicians with `pricingMatrix` |
| `firestore.rules` | Allow technician to write pricing-matrix + availability fields |
| `knowledge-base/integrations/firebase-schema.md` | Document pricingMatrix field |

---

## 12. Implementation Order

Execute in this order to minimize broken states:

1. **Types + matrix helpers** — `src/types/index.ts` + `src/lib/technician-matrix.ts`  
   No UI, no risk. Establishes all new interfaces.

2. **DB layer** — Update `src/lib/db/technicians.ts` to derive legacy fields on write.  
   Still backward-compatible.

3. **API endpoints** — Add new `POST /api/admin/technicians`, `PATCH /api/technicians/me/pricing-matrix`, `PATCH /api/technicians/me/availability`. Extend existing PATCH.

4. **Migration script** — Run `scripts/migrate-pricing-matrix.ts` against dev Firestore.

5. **Admin UI — Tab refactor** — Extract current sidebar into Profile tab, add Pricing Matrix tab and Availability tab.

6. **Admin UI — Create/Delete** — Add create modal and delete button.

7. **Technician dashboard pages** — New `/dashboard/technician/pricing` and `/dashboard/technician/availability` pages.

8. **Booking wizard** — Update Step 3 filter and price display (with legacy compat shim).

9. **Seed script** — Update to generate matrix-based technicians.

10. **Remove compat shim** — After confirming all live technicians have been migrated.

---

## 13. Acceptance Criteria

### Admin
- [ ] Admin can create a new technician by providing email + basic profile
- [ ] Admin can open any technician and see 3 tabs: Perfil, Servicios & Precios, Horarios
- [ ] In Servicios & Precios: admin can toggle each service × model cell on/off and set a price
- [ ] Toggling a cell off hides the price input for that cell
- [ ] "Copiar precio a fila" stamps a single price across all enabled models for a service
- [ ] Saving the matrix updates the technician's `pricingMatrix` and re-derives `services`, `supportedBrands`, `pricing`
- [ ] In Horarios: admin can set start/end time per day and toggle days on/off
- [ ] Admin can soft-delete a technician (cannot delete if active bookings exist)

### Technician dashboard
- [ ] Technician can navigate to /dashboard/technician/pricing and manage their own matrix
- [ ] Technician can navigate to /dashboard/technician/availability and manage their own hours
- [ ] Saving pricing-matrix updates derived fields same as admin path

### Booking wizard
- [ ] Step 3 only shows technicians with `pricingMatrix[serviceId][modelId].isAvailable === true`
- [ ] Each technician card shows "Desde $X" where X = `pricingMatrix[serviceId][modelId].price` for the selected model
- [ ] Sort by price in Step 3 uses model-specific price, not generic base price
- [ ] Booking confirmation uses the exact matrix price as `basePrice`
- [ ] If a technician has no matrix entry for the selected combination, they do not appear

### Backward compatibility
- [ ] Existing technicians without `pricingMatrix` still appear in the booking wizard (legacy shim)
- [ ] After running migration script, all technicians have a valid `pricingMatrix`

---

## 14. Edge Cases to Handle

| Case | Handling |
|---|---|
| Technician sets price = 0 for an available slot | Allow it — some services may be free (e.g., warranty work). Validate `price >= 0`. |
| Model becomes inactive in catalog | Matrix entries for that model are ignored in wizard; still visible in admin editor grayed out |
| Service becomes inactive | Same as above — no structural change to matrix needed |
| Admin creates technician with no matrix | Technician starts invisible in booking wizard (no available combinations). Admin or technician must configure matrix before approving. |
| Two technicians have identical pricing | No issue — both appear in Step 3, sorted by rating by default |
| Technician has matrix but `isApproved: false` | Never appears in public booking wizard (existing isApproved filter still applies) |
| Delete technician with pending bookings | Block the delete; show count of affected bookings and status; admin must cancel or resolve them first |
| Model added to catalog after matrix was saved | New model doesn't appear in matrix until admin/technician explicitly adds it — no auto-population |
