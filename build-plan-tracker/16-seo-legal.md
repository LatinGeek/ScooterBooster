# Tracker - Phase 16: SEO, Metadata & Legal Pages

> Status: PARTIAL
> Last updated: 2026-04-19

## Tasks

- [x] Per-page metadata (title, description) across public marketing, catalog, legal, auth, and dashboard routes
- [x] `sitemap.xml` + `robots.txt`
- [x] JSON-LD schemas for Organization, Product, Service, LocalBusiness, FAQ, and AggregateRating when data exists
- [ ] Google Search Console verification
- [x] Legal pages: Terms, Privacy Policy, Cookie Policy, FAQ
- [x] Cookie consent banner (local consent storage for dev/prototype flow)
- [ ] Cookie banner persistence integrated with a future analytics preference system

## Notes

- JSON-LD now renders from live data on `/`, `/services`, `/scooters/[id]`, `/technicians/[id]`, and `/legal/faq`.
- Cookie consent currently stores a local acceptance flag in the browser (`sb-cookie-consent`) so we can validate UX in dev before wiring optional analytics preferences.
- Search Console and any production verification tags remain intentionally deferred while we stay in dev mode.
