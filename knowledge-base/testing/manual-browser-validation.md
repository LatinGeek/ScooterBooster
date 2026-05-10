# Manual Browser Validation — ScooterBooster

End-to-end manual QA checklist for ScooterBooster. Walk through each flow in a real browser before shipping, especially after touching auth, booking, payments, role gating, or the navbar.

> **Conventions**
> - All UI strings are **Spanish**. If you see English copy in the UI, that is a defect.
> - Currency: **UYU**, formatted with thousand-dot separators (e.g. `$1.500`).
> - Phone format: `+598XXXXXXXX` (8 digits after country code).
> - "Verified" = green check / `ShieldCheck` icon, never a colored badge alone.
> - Test in: **desktop** (≥1280px), **tablet** (~768px), **mobile** (~390px). Use Chrome DevTools device emulation when you can't grab a real device.

---

## 0. Pre-flight — environment and accounts

Before you start, confirm:

- [ ] `.env.local` (or Vercel env) contains valid Firebase + MercadoPago keys.
- [ ] Firebase project has at least: 1 admin user, 1 technician user, 1 regular user, 7 brands, several models, 4 services (`speed-limit`, `firmware`, `cruise-control`, `maintenance`).
- [ ] At least one technician has `isApproved=true` and an `approvedAt` timestamp.
- [ ] At least one technician has `serviceArea` coordinates set (for the map / distance sort).
- [ ] MercadoPago is in **sandbox** mode unless this is a prod smoke test.
- [ ] Browser cache is cleared (or use Incognito) for at least one full pass.

Test accounts to keep handy:

| Role        | Email                          | Notes                              |
|-------------|--------------------------------|------------------------------------|
| `user`      | `qa+user@scooterbooster.uy`    | Default Google SSO account         |
| `technician`| `qa+tech@scooterbooster.uy`    | Approved technician                |
| `admin`     | `qa+admin@scooterbooster.uy`   | Has `role: "admin"` in Firestore   |
| `pending`   | `qa+pending@scooterbooster.uy` | Technician applied, not approved   |

---

## 1. Anonymous landing experience

### 1.1 Homepage — `/`

- [ ] Hero video autoplays, is muted, loops, and stays behind the dark gradient overlay.
- [ ] Headline reads **"Potenciá tu scooter eléctrico"** with the second line gradient-styled in emerald.
- [ ] Two CTAs visible: **Ver servicios** → `/services`, **Encontrar técnicos** → `/technicians`.
- [ ] "Nuestros servicios" section renders 4 cards (Eliminación de Límite, Firmware, Control Crucero, Mantenimiento).
- [ ] Each service card links to `/services#<slug>` and the page scrolls to that anchor.
- [ ] "¿Cómo funciona?" shows 3 numbered steps.
- [ ] Trust signals row shows verified, reviews, WhatsApp icons.
- [ ] CTA banner "¿Listo para potenciar tu scooter?" links to `/scooters`.
- [ ] Footer renders 4 columns: brand, Servicios, Plataforma, Legal. All links resolve (no 404).
- [ ] Copyright reads `© 2026 ScooterBooster`.

### 1.2 Navbar — global

- [ ] Logo (Bike icon + "ScooterBooster") routes to `/`.
- [ ] Desktop links: Scooters, Servicios, Técnicos. Hover transitions to dark text.
- [ ] Search box visible at `lg` breakpoint and above; typing triggers the suggestions panel.
- [ ] **Anonymous state:** "Iniciar sesión" (ghost) + "Reservar ahora" (primary).
- [ ] **Authed state:** AdminViewSwitcher (admin only), notification bell, "Mi panel", "Reservar ahora".
- [ ] On mobile (`<md`), hamburger toggles a drawer with the same links plus auth actions and search.
- [ ] Loading skeletons appear briefly during `useAuth` initialization, then the real CTAs replace them.

### 1.3 Footer — global

- [ ] Servicios links → `/services` (each one).
- [ ] Plataforma links → `/scooters`, `/technicians`, `/login`.
- [ ] Legal links → `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/faq`.

---

## 2. Authentication

### 2.1 Login — `/login`

- [ ] Card centered, ScooterBooster logo on top, headline "Bienvenido".
- [ ] Single button "Continuar con Google".
- [ ] Click opens Google SSO popup.
- [ ] Approve sign-in → redirect to `/` (or the `?redirect=…` param, if set).
- [ ] Cancel popup → no error toast, button re-enables.
- [ ] If Google rejects, a red banner reads **"No se pudo iniciar sesión. Intentá de nuevo."**.
- [ ] Footer links to `/legal/terms` and `/legal/privacy` are clickable.
- [ ] `?redirect=/dashboard` param: after sign-in lands on `/dashboard`, not `/`.
- [ ] Open-redirect guard: `?redirect=https://evil.com` falls back to `/` (must NOT navigate off-domain).

### 2.2 Onboarding — `/onboarding`

Triggered for new users (no `phone` set yet) the first time they sign in.

- [ ] Spinner while `useAuth` is loading.
- [ ] Pre-fills `fullName` from Google profile.
- [ ] Submit empty / 1-character name → "El nombre debe tener al menos 2 caracteres."
- [ ] Submit `099 12 34 56` (any non-`+598…` format) → "El teléfono debe tener formato +598XXXXXXXX (ej: +59899123456)."
- [ ] Submit valid `+59899123456` → user document updated, redirect to `/`.
- [ ] WhatsApp consent checkbox is optional; toggling it persists.
- [ ] If the user already has `phone` set, this page redirects to `/` immediately.

### 2.3 Sign-out

- [ ] From `/dashboard`, sidebar **Cerrar sesión** signs out and redirects to `/`.
- [ ] Same in `/dashboard/technician` and `/admin`.
- [ ] After sign-out, the navbar returns to the anonymous state without a refresh.

---

## 3. Scooter catalog — `/scooters`

- [ ] Hero copy: **"Catálogo de Scooters"**.
- [ ] Brands group cards by `brandId`. Brands with zero models are **hidden** (not rendered as empty).
- [ ] Each brand row shows count `N modelo(s)` (singular when N=1).
- [ ] Grid is 1/2/3/4 columns at `sm/md/lg/xl`.
- [ ] Empty state copy: **"No hay modelos disponibles en este momento."** (force by clearing models in Firestore for a sandbox test).
- [ ] "¿No encontrás tu modelo?" CTA at the bottom routes to `/technicians`.

### 3.1 Scooter detail — `/scooters/[id]`

- [ ] Loading a real model shows the brand name, model name, image, and compatible services.
- [ ] Each compatible service has a "Reservar" CTA that opens `/booking?modelId=…&serviceId=…` (note: `/booking` itself redirects to `/booking/new` — see §6).
- [ ] An invalid `[id]` returns 404.

---

## 4. Services

### 4.1 Catalog — `/services`

- [ ] Hero "Nuestros Servicios" + "Reservar ahora" CTA → `/booking`.
- [ ] Each card shows: icon, name, description, **"Desde $X UYU"**, **`~N min`** estimate.
- [ ] Services with `requiresDisclaimer=true` show the amber **"Solo para uso en propiedad privada…"** warning.
- [ ] Each card has **Ver detalle** (`/services/[slug]`) and **Reservar** (`/booking?serviceId=…`) actions.
- [ ] Bottom CTA banner routes to `/technicians`.
- [ ] Empty state: "No hay servicios disponibles en este momento."

### 4.2 Service detail — `/services/[slug]`

- [ ] `slug` invalid → 404.
- [ ] Page lists technicians who offer this service.
- [ ] If service requires disclaimer, the legal warning is shown.

---

## 5. Technicians

### 5.1 Catalog — `/technicians`

- [ ] Hero shows **"Técnicos Verificados"** and `N técnicos activos`.
- [ ] "¿Sos técnico?" banner CTA → `/technicians/apply`.
- [ ] Sort/location controls (zonas rápidas + "Mi ubicación") modify the URL with `location`, `lat`, `lng`, `near` params.
- [ ] Picking a preset zone reloads results filtered to that area.
- [ ] "Mi ubicación" prompts the geolocation permission. Approving sets `lat`/`lng` and re-sorts by distance.
- [ ] Distance shown on each card (in km) when coordinates are available.
- [ ] Technician cards show: name, photo, rating, review count, brands, "Verificado" badge.
- [ ] Click a card → `/technicians/[id]?…` carrying current params.
- [ ] Empty state when no technicians match the filter.

### 5.2 Technician detail — `/technicians/[id]`

- [ ] Header with photo, name, rating, brands and services they cover.
- [ ] WhatsApp button opens a `wa.me/598…` link in a new tab (verify the country code, no leading `+` in the URL).
- [ ] "Reservar con este técnico" CTA → `/booking?technicianId=…`.
- [ ] Reviews section lists user reviews with stars.
- [ ] Invalid id → 404.

### 5.3 Technician application — `/technicians/apply`

- [ ] Anonymous: redirect to `/login?redirect=/technicians/apply`.
- [ ] Already-technician: redirect to `/dashboard/technician`.
- [ ] Admin: redirect to `/admin`.
- [ ] User without onboarded profile: redirect to `/onboarding`.
- [ ] Form validates required fields; submission creates a pending technician document.
- [ ] After submit, page indicates "pendiente de revisión" or routes to a confirmation state.

---

## 6. Booking flow

### 6.1 Booking entry — `/booking`

- [ ] Hitting `/booking` issues a 307 redirect to `/booking/new`, **preserving query params**.
- [ ] Aliased params translate correctly: `modelId→model`, `serviceId→service`, `technicianId→technician`.
- [ ] Verify with: `/booking?modelId=abc&serviceId=def` → `/booking/new?model=abc&service=def`.

### 6.2 New booking wizard — `/booking/new`

5 steps. Test with an **anonymous** user first (most steps are public; the final submit may require auth).

**Step 1 — Scooter**
- [ ] Lists brands with at least one active model.
- [ ] Selecting a brand reveals the model list.
- [ ] Selecting a model enables "Continuar".

**Step 2 — Service**
- [ ] Shows services compatible with the picked model.
- [ ] Speed-limit service triggers the **DisclaimerModal** before continuing.
- [ ] User must scroll/accept the disclaimer to proceed; declining keeps them on step 2.
- [ ] "Continuar" is disabled until a service is picked (and disclaimer accepted if applicable).

**Step 3 — Technician**
- [ ] List shows technicians compatible with chosen `model + service`.
- [ ] Sort bar (`TechnicianSortBar`) toggles by rating, price, distance.
- [ ] Toggle list ↔ map view (`TechnicianMap` lazy-loads, no SSR).
- [ ] Map markers appear at expected approximate coordinates; clicking a marker selects the tech.
- [ ] If geolocation is granted, distances are shown; if denied, the sort by distance is disabled or falls back to rating.
- [ ] Price displayed per technician = `getTechnicianBookingPrice(...)` for that model+service combination.

**Step 4 — Schedule**
- [ ] Date picker rejects dates in the past.
- [ ] Notes field accepts free text.
- [ ] Pricing summary shows `base price + 10% platform fee = total`. Confirm exact UYU formatting.

**Step 5 — Confirmation**
- [ ] Review of all selections before submit.
- [ ] If anonymous: clicking "Confirmar" prompts login (or routes through `/login?redirect=/booking/new?...`).
- [ ] If authed: creates booking, redirects to `/booking/[id]` and triggers the MercadoPago checkout.
- [ ] Analytics events fire (`booking_started`, `booking_step_completed`, `booking_submitted`) — verify in DevTools network tab.

### 6.3 Booking detail — `/booking/[id]`

- [ ] Anonymous → redirect to `/login?redirect=/booking`.
- [ ] User who is not `booking.userId` (and not the assigned technician, and not admin) → 404.
- [ ] Booking status badge reflects current state (`pending`, `confirmed`, `completed`, `cancelled`).
- [ ] Payment status badge reflects current state (`pending`, `paid`, `failed`).
- [ ] "Pagar ahora" button visible while `paymentStatus !== "paid"`. Clicking redirects to MercadoPago.
- [ ] Once paid, "Pagar ahora" disappears and the badge flips to **Pagado**.
- [ ] Technician contact (WhatsApp) link is correct and opens new tab.
- [ ] If booking is `completed` and user has no review yet, a "Dejar reseña" CTA appears.
- [ ] Review form: 1–5 star selector, free-text comment, submit creates review and refreshes.

### 6.4 Payment return URLs

MercadoPago redirects back to one of three sub-routes; each must render correctly even when reached without query params.

- [ ] `/booking/[id]/success` — green banner, "Pago aprobado", CTA back to dashboard.
- [ ] `/booking/[id]/failure` — red banner, "El pago fue rechazado", CTA to retry.
- [ ] `/booking/[id]/pending` — amber banner, "Tu pago está en revisión".
- [ ] Hitting the parent `/booking/[id]` with `?status=approved&payment_id=…` triggers `syncMercadoPagoPayment` and flips the booking to paid (verify in Firestore + UI).

---

## 7. User dashboard — `/dashboard`

Authed as a regular user.

- [ ] Anonymous → `/login?redirect=/dashboard`.
- [ ] Sidebar nav: **Mis reservas**, **Notificaciones**, **Perfil**.
- [ ] User card shows photo (or initial), display name, email.
- [ ] AdminViewSwitcher only renders for admins (regular user should not see it).
- [ ] **Mis reservas:** list of the user's bookings, each clickable → `/booking/[id]`.
- [ ] Empty state when user has no bookings.
- [ ] **Notificaciones** (`/dashboard/notifications`): renders list, marks as read on click.
- [ ] **Perfil** (`/dashboard/profile`): edit name, phone, WhatsApp consent. Validation matches the onboarding rules.
- [ ] **Cerrar sesión**: signs out and routes to `/`.
- [ ] Mobile: bottom tab bar mirrors the sidebar.

---

## 8. Technician dashboard — `/dashboard/technician`

Authed as a `technician`.

- [ ] Non-technician users hitting `/dashboard/technician` should be denied (verify the redirect / 403 behavior).
- [ ] Sidebar: Resumen, Perfil, Reservas, Disponibilidad, Precios, Ganancias, Reseñas.
- [ ] **Resumen** shows KPI cards (next booking, week earnings, rating, reviews count).
- [ ] **Perfil** (`/dashboard/technician/profile`): edit photo, bio, brands covered, service area. Save persists.
- [ ] **Reservas** (`/dashboard/technician/bookings`): list bookings assigned to this technician. Status filter works.
- [ ] **Disponibilidad** (`/dashboard/technician/availability`): weekly calendar / slot management. Saves persist.
- [ ] **Precios** (`/dashboard/technician/pricing`): per-service pricing matrix. Validation prevents prices below platform minimums.
- [ ] **Ganancias** (`/dashboard/technician/earnings`): monthly chart, totals net of platform fee.
- [ ] **Reseñas** (`/dashboard/technician/reviews`): list of received reviews; technician can reply.
- [ ] **Cerrar sesión** → `/`.

---

## 9. Admin panel — `/admin`

Authed as `admin`.

- [ ] Non-admins are blocked.
- [ ] Sidebar shows the amber "Panel Admin" badge.
- [ ] Sidebar nav: Resumen, Técnicos, Usuarios, Reservas, Scooters, Servicios, Reseñas, Auditoría, Observabilidad, Configuración.
- [ ] **AdminViewSwitcher** appears in the sidebar — toggling switches between admin / user views (verify routing).

### 9.1 Resumen — `/admin`

- [ ] KPI cards: total bookings, GMV, active technicians, pending applications.
- [ ] Charts (`AdminOverviewCharts`) render bookings + GMV trend; tooltips show formatted UYU amounts.

### 9.2 Técnicos — `/admin/technicians`

- [ ] List of all technicians with status badge (`pending`, `approved`, `rejected`).
- [ ] Approving a pending tech updates the badge and writes `approvedAt`.
- [ ] Rejecting prompts for a reason and persists it.
- [ ] Filter by status; search by name/email.

### 9.3 Usuarios — `/admin/users`

- [ ] List all users; can change role (user / technician / admin) — verify the change reflects in `useAuth` after the user refreshes.
- [ ] Cannot demote the last remaining admin (guard required).

### 9.4 Reservas — `/admin/bookings`

- [ ] All bookings across users. Filters by status, date range, technician.
- [ ] Click row → `/booking/[id]` (admin always has access).

### 9.5 Scooters — `/admin/scooters`

- [ ] CRUD on brands and models. Disabling a brand hides it from `/scooters` and the booking wizard.

### 9.6 Servicios — `/admin/services`

- [ ] Toggle service active/inactive. Inactive services disappear from `/services` and step 2 of the wizard.
- [ ] Edit price ranges, duration, disclaimer flag. Saves persist.

### 9.7 Reseñas — `/admin/reviews`

- [ ] All reviews. Admin can hide/flag a review; hidden reviews disappear from public technician profile.

### 9.8 Auditoría — `/admin/audit`

- [ ] Audit log entries for sensitive actions (role changes, technician approvals, service edits).

### 9.9 Observabilidad — `/admin/observability`

- [ ] Renders the observability dashboard (request volume, errors). No console errors.

### 9.10 Configuración — `/admin/settings`

- [ ] Service fee % editable. Edit reflects on the next booking pricing calculation.

---

## 10. Search — `/search`

- [ ] Empty `q` shows a default state and suggested queries (e.g. "montevideo", "mantenimiento", "xiaomi").
- [ ] `/search?q=xiaomi` returns results across scooters / services / technicians.
- [ ] Result groups have correct counts and links to the right detail pages.
- [ ] Navbar `GlobalSearchBox` suggestions navigate to the same query results.

---

## 11. Legal pages

- [ ] `/legal` — index page lists the 4 legal documents.
- [ ] `/legal/terms` — Términos y condiciones renders, copy is in Spanish.
- [ ] `/legal/privacy` — Política de privacidad renders.
- [ ] `/legal/cookies` — Política de cookies renders.
- [ ] `/legal/faq` — Preguntas frecuentes renders with collapsible items (if accordion is used).
- [ ] Footer + login page links all reach these pages.

---

## 12. Notifications — `NotificationBell`

- [ ] Bell icon in navbar (and dashboard sidebar) shows unread count badge.
- [ ] Clicking opens a popover with the latest N notifications.
- [ ] Marking one as read decrements the badge.
- [ ] "Ver todas" routes to `/dashboard/notifications`.

---

## 13. AdminViewSwitcher

Only visible for users with `role=admin`.

- [ ] In the navbar (desktop + mobile), the switcher lets the admin "Ver como Usuario" or "Ver como Técnico".
- [ ] Switching to user view changes `Mi panel` to `/dashboard`; technician view → `/dashboard/technician`; admin view → `/admin`.
- [ ] Switching reflects across other pages without a hard refresh.

---

## 14. Role-based access matrix

Spot-check the matrix with each test account:

| Route                          | anon                | user            | technician           | admin           |
|--------------------------------|---------------------|-----------------|----------------------|-----------------|
| `/`                            | ✅                  | ✅              | ✅                   | ✅              |
| `/scooters`, `/services`, `/technicians` | ✅       | ✅              | ✅                   | ✅              |
| `/booking/new`                 | ✅ (until submit)   | ✅              | ✅                   | ✅              |
| `/dashboard`                   | →`/login?redirect=` | ✅              | ✅                   | ✅              |
| `/dashboard/technician`        | →`/login`           | 403/redirect    | ✅                   | ✅              |
| `/admin`                       | →`/login`           | 403/redirect    | 403/redirect         | ✅              |
| `/technicians/apply`           | →`/login`           | ✅              | →`/dashboard/technician` | →`/admin`   |
| `/booking/[id]` (other user's) | →`/login`           | 404             | 404 (unless theirs)  | ✅              |

Verify each cell. Any green check that 404s, or any redirect that doesn't preserve `?redirect=`, is a bug.

---

## 15. MercadoPago end-to-end (sandbox)

Run once per release.

- [ ] Create booking as user → MP redirects to sandbox checkout.
- [ ] Use **APRO** test card → success page → `/booking/[id]` reflects `paid`, `confirmed`.
- [ ] Use **OTHE** test card → failure page; booking stays `pending` and `paymentStatus=failed`.
- [ ] Use **CONT** test card → pending page; `paymentStatus=pending`, status flips when MP webhook fires.
- [ ] `POST /api/payments` webhook with a forged signature must be rejected (verify in logs).
- [ ] Refund: trigger from admin (if implemented) and verify booking flips to `cancelled`/`refunded`.

---

## 16. Cross-cutting checks

### 16.1 Internationalization & copy

- [ ] No English copy anywhere user-facing.
- [ ] All currency uses `$` + thousand-dot separator (e.g. `$1.500`, never `$1,500`).
- [ ] Date format is Uruguayan (`DD/MM/AAAA` or `DD de MMM`).

### 16.2 Responsive

- [ ] Resize from 1440px → 768px → 390px on key pages (home, services, technicians, booking wizard, dashboards).
- [ ] No horizontal scroll. No clipped CTAs. Mobile bottom nav doesn't overlap content (`pb-24` on dashboard main is intentional).

### 16.3 Accessibility quick pass

- [ ] Tab through the homepage and login: focus rings are visible (emerald outline).
- [ ] All `<button>` and `<a>` have accessible names (no "click here" style).
- [ ] Images have meaningful `alt` (or `alt=""` when decorative).
- [ ] Color contrast OK on primary buttons and the dark hero overlay.

### 16.4 Performance / console

- [ ] No console errors on any of the routes above (warnings about React keys, hydration, or missing alt text are bugs).
- [ ] No 404s in the network tab for assets (`/assets/video/Hero-video.mp4`, brand logos, service icons).
- [ ] Lighthouse on `/`: Performance ≥ 80, Accessibility ≥ 90 on desktop.

### 16.5 SEO

- [ ] Each page has a `<title>` and `<meta name="description">` in Spanish.
- [ ] Homepage emits `application/ld+json` Organization schema.
- [ ] `/services` emits a `@graph` of `Service` entries.
- [ ] `robots.txt` and `sitemap.xml` are reachable (if deployed).

---

## 17. Regression cheat-sheet

A rapid 10-minute pass to run before each merge to `main`:

1. Open `/` anonymous → click "Reservar ahora" → wizard step 1 loads.
2. Sign in → land on `/` with navbar showing "Mi panel".
3. Open `/dashboard` → see at least one historic booking (or empty state).
4. Open `/booking/new`, complete steps 1–4, stop at confirmation.
5. Switch account to admin → `/admin` resumen loads with charts.
6. Sign out from each role → ends at `/` anonymous.

If any of those steps fails or shows a console error, **block the release** and open a bug.

---

## Appendix A — Known gotchas

- Firebase client SDK is initialized lazily (`getFirebaseAuth`, `getFirebaseDb`). Hot reload after env changes can leave a stale instance; do a hard refresh.
- `useAuth` returns `loading=true` for the first render — skeletons in the navbar are expected, not a bug.
- The booking redirect at `/booking` rewrites query params (`modelId→model`, etc). If a deep link is broken, check the alias map in `src/app/(main)/booking/page.tsx`.
- `TechnicianMap` is dynamic-imported with `ssr: false` — first load shows a "Cargando mapa de técnicos..." placeholder; that is by design.
- Speed-limit service requires the disclaimer modal at booking step 2 — confirm this before merging changes to `lib/booking-rules.ts`.
