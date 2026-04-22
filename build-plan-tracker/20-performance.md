# Tracker — Phase 20: Performance & Polish

> Status: PARTIAL — public polish is done, and desktop authenticated smoke is now covered; the remaining gap is formal desktop Lighthouse scoring
> Last updated: 2026-04-22

## Tasks

- [x] Image optimization — AVIF+WebP formats, remotePatterns for Firebase/Google, deviceSizes configured in `next.config.ts`
- [x] Font loading — migrated root typography to `next/font/google` `Inter` with `display: "swap"`, Latin subset, and variable preload only at the app shell
- [x] Route splitting — `next/dynamic` (aliased as `lazyLoad`) on all 6 heavy dashboard client components
- [x] Caching — `unstable_cache` on `getActiveBrands`, `getActiveServices`, `getActiveTechnicians` (5 min, tag-based); `revalidateTag` on admin technician approval
- [x] Skeleton states — `loading.tsx` for `(main)`, scooters, technicians, services, user dashboard, technician dashboard, admin
- [ ] Animations — `prefers-reduced-motion` is covered globally; no additional motion layer has been added for MVP
- [x] Empty states — present in all client components (star, calendar icons + helper text)
- [x] Error states — `error.tsx` boundary for `(main)` and dashboard; branded `not-found.tsx` + `global-error.tsx`
- [x] Toasts — sonner v2 installed; Toaster mounted in root layout with emerald success / red error palette; all `alert()` calls replaced
- [x] Microcopy review — public home/login/services copy now uses consistent Spanish labels (`Deslimitación`, `Control de crucero`, legal links under `/legal/*`, sentence-case headings)
- [x] Avatar/media lint cleanup — remaining dashboard/admin avatar warnings were migrated from raw `<img>` to `next/image`
- [ ] Lighthouse audit — public mobile targets are green; formal desktop scoring still pending

## Notes

- `revalidateTag` in Next.js 16 requires two arguments: `revalidateTag(tag, { expire: 0 })`.
  Single-arg form is deprecated and errors at TypeScript build time.
- `import dynamic` collides with `export const dynamic = "force-dynamic"` segment config.
  Solution: alias the next/dynamic import as `lazyLoad` in all dashboard page files.
- `getActiveTechnicians` is parameterized — cache key encodes opts combo to prevent stale cross-filter hits.
- Sonner v2 classNames API: pass per-toast type styles via `toastOptions.classNames`.
- Public mobile Lighthouse run on 2026-04-19 against a local production server:
  - `/`: Perf 96, A11y 95, Best Practices 96, SEO 100
  - `/scooters`: Perf 94, A11y 95, Best Practices 96, SEO 100
  - `/services`: Perf 94, A11y 95, Best Practices 96, SEO 100
  - `/technicians`: Perf 93, A11y 95, Best Practices 96, SEO 100
  - `/booking/new`: Perf 94, A11y 95, Best Practices 96, SEO 100
- Authenticated desktop smoke is now covered in Playwright for the authorized navbar state, user notifications, admin users/bookings/audit, and technician profile management.
