# Technical Plan: Enhanced Technician Selection (Booking Step 3)

## Problem

Step 3 currently shows a flat list of technician cards with no sorting and no spatial context. Users can't compare technicians by quality or proximity, which are the two strongest decision signals for a service marketplace.

## Goals

1. **Sort/filter by rating** — let users rank technicians by stars, review count, or price
2. **Map-based selection** — show technicians on a map so users can pick by proximity
3. **Equal UX quality** on mobile (375px+) and desktop (1024px+)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  StepTechnician (refactored)                    │
│  ┌───────────────────────────────────────────┐  │
│  │  ViewToggle: [Lista | Mapa]               │  │
│  │  SortBar: rating ▼ | reseñas ▼ | precio ▼│  │
│  ├───────────────────────────────────────────┤  │
│  │  LIST VIEW          │  MAP VIEW           │  │
│  │  ┌──────────────┐   │  ┌───────────────┐  │  │
│  │  │ TechCard     │   │  │ MapContainer  │  │  │
│  │  │ TechCard ✓   │   │  │  📍 📍 📍     │  │  │
│  │  │ TechCard     │   │  │  [TechCard]   │  │  │
│  │  └──────────────┘   │  └───────────────┘  │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 1. Data Layer Changes

### 1a. Add coordinates to Technician type

```typescript
// src/types/index.ts
interface Technician {
  // ... existing fields
  coordinates?: { lat: number; lng: number } | null
}
```

**Why optional:** Existing technicians won't have coordinates until they update their profile. The map view gracefully excludes technicians without coordinates.

### 1b. Geocode on profile save

In `src/app/api/technicians/me/route.ts` (PATCH handler) and `src/app/api/technicians/apply/route.ts`:
- When `location` changes, look up coordinates from the existing `uruguay-locations.ts` presets
- If a preset matches, store `{ lat, lng }` on the technician document
- If no preset matches, leave `coordinates: null` (technician appears in list view but not on map)

This avoids a geocoding API dependency — we already have ~20 Montevideo neighborhood presets with coordinates.

### 1c. Backfill existing technicians

One-time script addition to `scripts/seed.ts`: iterate all technicians, match their `location` text to presets, write `coordinates`.

### 1d. Expose user geolocation

Add a small hook `src/hooks/use-geolocation.ts`:
- Wraps `navigator.geolocation.getCurrentPosition`
- Returns `{ lat, lng, loading, error, request }`
- Only triggers on explicit user action (button click), never on page load
- Memoizes result for the session

---

## 2. Sort & Filter Bar

New client component: `src/app/(main)/booking/new/technician-sort-bar.tsx`

### Sort options (radio-style toggle group)

| Label            | Sort key                         | Direction |
| ---------------- | -------------------------------- | --------- |
| Mejor valorados  | `rating`                         | desc      |
| Más reseñas      | `reviewCount`                    | desc      |
| Menor precio     | `pricing[serviceId].basePrice`   | asc       |
| Más cerca        | Haversine distance               | asc (only if user shared location) |

### Implementation

- Pure client-side sort on the already-filtered `available` array
- Sort state stored in component (`useState`), not in URL (too ephemeral)
- "Más cerca" option appears only after the user grants geolocation
- Default sort: `rating` descending (most intuitive default)

### UI

- Horizontal scrollable pill group on mobile (single row, swipe-able)
- Inline row of buttons on desktop
- Active pill gets primary color fill, others are outlined
- Uses shadcn `ToggleGroup` component (already in the project)

---

## 3. Map View

### 3a. Library choice: Leaflet + react-leaflet

**Why Leaflet over Mapbox/Google Maps:**
- Free, no API key needed — zero ongoing cost for a startup
- OpenStreetMap tiles are good quality for Uruguay
- `react-leaflet` has stable React 18/19 support
- ~40KB gzipped (acceptable for a lazy-loaded view)
- No usage limits or billing surprises

**New dependencies:**
```
leaflet
react-leaflet
@types/leaflet (devDep)
```

### 3b. Map component: `src/components/technician-map.tsx`

```typescript
interface TechnicianMapProps {
  technicians: (Technician & { distance?: number })[]
  selectedId: string | null
  userLocation?: { lat: number; lng: number } | null
  onSelect: (id: string) => void
}
```

**Behavior:**
- Renders a Leaflet map centered on Montevideo (-34.9011, -56.1645) at zoom 12
- One marker per technician that has `coordinates`
- Custom marker icons: default pin (green) for unselected, highlighted pin (primary color) for selected
- User location shown as a blue pulsing dot (if available)
- Clicking a marker selects the technician and opens a popup/bottom sheet with the compact TechnicianCard
- Map auto-fits bounds to show all visible markers + user location

**Lazy loading:**
- `react-leaflet` and Leaflet CSS loaded via `next/dynamic` with `ssr: false` (Leaflet requires `window`)
- Shows a skeleton/spinner while the map chunk loads

### 3c. Layout by viewport

**Mobile (< 768px):**
- Map fills full width, 60vh height
- Selected technician card slides up from bottom as a sheet (overlays map bottom)
- Card is dismissable by tapping map background
- Swipe-up on card expands to show full details + "Seleccionar" button

**Tablet/Desktop (≥ 768px):**
- Split layout: map takes 60% width (right), scrollable technician list takes 40% (left)
- Clicking a list card highlights the marker on the map and vice versa
- Both list and map stay visible simultaneously
- Selected technician has the existing green border treatment in the list

```
Mobile:                    Desktop:
┌──────────────┐          ┌─────────┬──────────────┐
│              │          │ Card    │              │
│    MAP       │          │ Card ✓  │    MAP       │
│              │          │ Card    │              │
│   📍  📍     │          │ Card    │  📍   📍     │
├──────────────┤          │         │       📍     │
│ [TechCard ✓] │          │         │              │
└──────────────┘          └─────────┴──────────────┘
```

---

## 4. View Toggle

A simple two-segment toggle at the top of step 3: **"Lista" | "Mapa"**

- Uses shadcn `Tabs` or a custom `ToggleGroup`
- Persists view preference in `localStorage` (user might go back and forth between steps)
- Default: "Lista" (no loading cost until user switches)
- When switching to map, lazy-loads the map chunk
- Icons: `List` and `MapPin` from lucide-react

---

## 5. Geolocation UX

**Trigger:** A button "Usar mi ubicación" with a `MapPin` icon, placed in the sort bar area.

**Flow:**
1. User taps "Usar mi ubicación"
2. Browser permission prompt appears
3. On grant: "Más cerca" sort option unlocks, user dot appears on map, distance shown on cards
4. On deny: toast with "No pudimos acceder a tu ubicación" — everything else works, just no distance sorting

**Privacy:** Coordinates stay client-side only. Never sent to the server or stored.

---

## 6. File Changes Summary

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `coordinates?: { lat: number; lng: number } \| null` to Technician |
| `src/hooks/use-geolocation.ts` | **New** — browser geolocation hook |
| `src/components/technician-map.tsx` | **New** — Leaflet map with technician markers |
| `src/app/(main)/booking/new/booking-wizard.tsx` | Refactor StepTechnician: add sort bar, view toggle, map view |
| `src/app/(main)/booking/new/technician-sort-bar.tsx` | **New** — sort pill group |
| `src/components/technician-card.tsx` | Add distance display to compact variant |
| `src/lib/db/technicians.ts` | Write `coordinates` on profile update |
| `src/app/api/technicians/me/route.ts` | Geocode from presets on location change |
| `src/app/api/technicians/apply/route.ts` | Geocode from presets on application |
| `scripts/seed.ts` | Backfill coordinates for seeded technicians |
| `package.json` | Add `leaflet`, `react-leaflet`, `@types/leaflet` |

---

## 7. Edge Cases

- **No technicians have coordinates:** Map view shows empty state with message "Los técnicos aún no tienen ubicación registrada" and suggests list view
- **Only 1 technician matches:** Still show the step so the user confirms the choice, but auto-select and show "Solo un técnico disponible para este servicio"
- **Technician without coordinates:** Appears in list view, excluded from map markers, shown in a "Sin ubicación" group below the map on desktop
- **User denies geolocation:** Distance sort hidden, map still works (centered on Montevideo), no degradation

---

## 8. Performance Considerations

- Leaflet chunk is ~40KB gzipped — only loaded when user switches to map view
- OpenStreetMap tile CDN is free and fast for Uruguay
- No server round-trips for sorting (all client-side on the existing dataset)
- Marker clustering not needed yet (unlikely to have 50+ technicians in early launch)

---

## 9. Sequence of Implementation

1. **Data:** Add `coordinates` to type + backfill in seed + geocode on save
2. **Sort bar:** Build the sort UI + client-side sorting logic
3. **Geolocation hook:** Build + wire to sort bar's "Más cerca" option
4. **Map component:** Build Leaflet map with markers + selection
5. **View toggle + layout:** Wire list/map toggle, responsive split layout
6. **Mobile bottom sheet:** Card popup on marker tap
7. **Polish:** Transitions, loading states, empty states, a11y
