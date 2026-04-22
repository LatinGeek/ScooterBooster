# Tracker - Phase 16: SEO, Metadata & Legal Pages

> Status: COMPLETE - SEO metadata, JSON-LD, legal content, cookie controls, and Search Console ownership are now all closed
> Last updated: 2026-04-22

## Tasks

- [x] Per-page metadata (title, description) across public marketing, catalog, legal, auth, and dashboard routes
- [x] `sitemap.xml` + `robots.txt`
- [x] JSON-LD schemas for Organization, Product, Service, LocalBusiness, FAQ, and AggregateRating when data exists
- [x] Google Search Console verification
- [x] Search Console verification hook is ready in metadata (`GOOGLE_SITE_VERIFICATION` env)
- [x] Legal pages: Terms, Privacy Policy, Cookie Policy, FAQ
- [x] Cookie consent banner (local consent storage for dev/prototype flow)
- [x] Cookie banner persistence integrated with a future analytics preference system

## Notes

- JSON-LD now renders from live data on `/`, `/services`, `/scooters/[id]`, `/technicians/[id]`, and `/legal/faq`.
- Cookie consent now stores structured local preferences in `sb-cookie-preferences`, with separate actions for essential-only vs analytics-enabled browsing. Legacy `sb-cookie-consent=accepted` values migrate automatically.
- Root metadata supports a future `google-site-verification` tag through `GOOGLE_SITE_VERIFICATION`, but Search Console ownership has already been completed via DNS TXT verification.
