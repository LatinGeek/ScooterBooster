# Phase 05 — Scooter Catalog (Brands & Models)

> **Goal:** Browsable, filterable catalog of scooter brands and models with detail pages linking to compatible services.

## 5.1 — Data Fetching

- [ ] Server component `src/app/(main)/scooters/page.tsx` fetches all brands + grouped models via `listBrandsWithModels()` in the data access layer
- [ ] Use React Suspense with a `loading.tsx` skeleton

## 5.2 — Catalog Page UI

- [ ] Hero: "Encontrá tu scooter" + search input (client)
- [ ] Filter chips: brand, min/max range (km), firmware-lockable toggle
- [ ] Grid of `ScooterCard` — brand logo, model name, top speed, range, CTA "Ver servicios"
- [ ] Empty state when filters return zero results
- [ ] Mobile: 1 col; tablet: 2; desktop: 3–4 cols

## 5.3 — Scooter Detail Page

- [ ] Route `src/app/(main)/scooters/[slug]/page.tsx`
- [ ] Use `params.slug` + `generateStaticParams()` for known models (ISR)
- [ ] Display: image, specs table, brand badge, firmware-lockable badge
- [ ] Section "Servicios disponibles" — fetch compatible services and render `ServiceCard`s
- [ ] Section "Técnicos recomendados" — top 3 approved technicians who service this model
- [ ] Breadcrumbs: Inicio → Scooters → {Brand} → {Model}

## 5.4 — Search API

- [ ] `GET /api/scooters?q=&brand=&minRange=` returning filtered list
- [ ] Validate query params with Zod
- [ ] Cache with Next.js `unstable_cache` tagged `scooters` for 1h

## 5.5 — SEO

- [ ] `generateMetadata` per model: title, description, OG image (brand logo over model image)
- [ ] JSON-LD `Product` schema on detail pages
- [ ] Canonical URLs

## Exit Criteria

- [ ] Catalog lists all seeded models
- [ ] Filters work
- [ ] Detail pages render with compatible services and technicians
- [ ] Pages pre-rendered at build; new models revalidate within 1h
- [ ] Lighthouse mobile ≥ 90 on catalog and one detail page
