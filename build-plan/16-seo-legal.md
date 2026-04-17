# Phase 16 — SEO, Metadata & Legal Pages

> **Goal:** Be discoverable on Google UY and legally compliant.

## 16.1 — Metadata Defaults

- [ ] Configure `src/app/layout.tsx` with `metadata`:
  - `title` template `%s | ScooterBooster`
  - `description` in Spanish
  - `openGraph` with default image
  - `twitter` card
  - `metadataBase` = `https://scooterbooster.uy`

## 16.2 — Per-Page Metadata

- [ ] `generateMetadata` on every route with dynamic content (scooter, service, technician, booking confirmation)
- [ ] Custom OG images per category (generated via `@vercel/og`)

## 16.3 — Sitemap & Robots

- [ ] `src/app/sitemap.ts` — dynamic sitemap with all scooters, services, approved technicians
- [ ] `src/app/robots.ts` — allow all except `/dashboard`, `/admin`, `/api`

## 16.4 — Structured Data (JSON-LD)

- [ ] `Organization` schema on homepage
- [ ] `Product` schema for scooter models
- [ ] `Service` schema for services
- [ ] `LocalBusiness` schema for technicians
- [ ] `AggregateRating` where applicable

## 16.5 — Google Search Console

- [ ] Verify `scooterbooster.uy` ownership (DNS TXT)
- [ ] Submit sitemap
- [ ] Configure geo-target: Uruguay
- [ ] Document in `knowledge-base/integrations/seo.md`

## 16.6 — Legal Pages (Spanish)

- [ ] `/terminos` — Terms of Service (include speed-limit disclaimer reference)
- [ ] `/privacidad` — Privacy Policy (GDPR-inspired + Uruguay data protection law Ley 18.331)
- [ ] `/cookies` — Cookie Policy
- [ ] `/contacto` — contact form + WhatsApp + email
- [ ] `/preguntas-frecuentes` — FAQ

## 16.7 — Cookie Consent

- [ ] Install `react-cookie-consent` or build custom banner
- [ ] Categories: necessary, analytics, marketing
- [ ] Persist choice; honor in analytics firing

## 16.8 — Hreflang (Out of Scope for MVP)

- [ ] MVP is Spanish-only; document as single-locale and set `<html lang="es">`
- [ ] Leave hook for i18n in Phase 2

## Exit Criteria

- [ ] Sitemap live and submitted
- [ ] All pages have unique titles and descriptions
- [ ] Structured data validated with [schema.org validator](https://validator.schema.org)
- [ ] Legal pages reviewed by counsel (or at minimum drafted from a reputable template)
- [ ] Cookie consent banner working
