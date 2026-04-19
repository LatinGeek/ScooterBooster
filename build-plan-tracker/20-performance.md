# Tracker — Phase 20: Performance & Polish

> Status: PARTIAL — major infra slice done; Lighthouse audit and microcopy pass remain
> Last updated: 2026-04-19

## Tasks

- [x] Image optimization — AVIF+WebP formats, remotePatterns for Firebase/Google, deviceSizes configured in next.config.ts
- [ ] Font loading — using @fontsource-variable/inter; variable fonts handle display:swap natively. Subset pending.
- [x] Route splitting — next/dynamic (aliased as `lazyLoad`) on all 6 heavy dashboard client components
- [x] Caching — unstable_cache on getActiveBrands, getActiveServices, getActiveTechnicians (5 min, tag-based); revalidateTag on admin technician approval
- [x] Skeleton states — loading.tsx for (main), scooters, technicians, services, user dashboard, technician dashboard, admin
- [ ] Animations — prefers-reduced-motion already covered via Tailwind; no framer-motion needed for MVP
- [x] Empty states — present in all client components (star, calendar icons + helper text)
- [x] Error states — error.tsx boundary for (main) and dashboard; branded not-found.tsx + global error.tsx
- [x] Toasts — sonner v2 installed; Toaster mounted in root layout with emerald success / red error palette; all alert() calls replaced
- [ ] Microcopy review — Spanish tone pass not yet done
- [ ] Lighthouse audit — targets: mobile Perf ≥ 90, A11y ≥ 95, SEO ≥ 95

## Notes

- `revalidateTag` in Next.js 16 requires two arguments: `revalidateTag(tag, { expire: 0 })`.
  Single-arg form is deprecated and errors at TypeScript build time.
- `import dynamic` collides with `export const dynamic = "force-dynamic"` segment config.
  Solution: alias the next/dynamic import as `lazyLoad` in all dashboard page files.
- `getActiveTechnicians` is parameterized — cache key encodes opts combo to prevent stale cross-filter hits.
- Sonner v2 classNames API: pass per-toast type styles via `toastOptions.classNames`.
