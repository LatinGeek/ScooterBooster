# Tracker - Phase 16: SEO, Metadata & Legal Pages

> Status: BLOCKED - the app-side SEO, metadata, legal content, JSON-LD, cookie controls, and Search Console hook are done; the remaining gap is external Search Console ownership verification
> Last updated: 2026-04-22

## Tasks

- [x] Per-page metadata (title, description) across public marketing, catalog, legal, auth, and dashboard routes
- [x] `sitemap.xml` + `robots.txt`
- [x] JSON-LD schemas for Organization, Product, Service, LocalBusiness, FAQ, and AggregateRating when data exists
- [ ] Google Search Console verification — blocked on external property ownership setup
- [x] Search Console verification hook is ready in metadata (`GOOGLE_SITE_VERIFICATION` env)
- [x] Legal pages: Terms, Privacy Policy, Cookie Policy, FAQ
- [x] Cookie consent banner (local consent storage for dev/prototype flow)
- [x] Cookie banner persistence integrated with a future analytics preference system

## Notes

- JSON-LD now renders from live data on `/`, `/services`, `/scooters/[id]`, `/technicians/[id]`, and `/legal/faq`.
- Cookie consent now stores structured local preferences in `sb-cookie-preferences`, with separate actions for essential-only vs analytics-enabled browsing. Legacy `sb-cookie-consent=accepted` values migrate automatically.
- Root metadata now supports a future `google-site-verification` tag through `GOOGLE_SITE_VERIFICATION`, so flipping Search Console on later is an env-only step.
- Search Console ownership itself remains intentionally deferred while we stay in dev mode.
