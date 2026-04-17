# Phase 20 — Performance & Polish

> **Goal:** Make every interaction feel fast and intentional. Lighthouse 90+ across the board on mobile.

## 20.1 — Image Optimization

- [ ] All images use `next/image`
- [ ] Provide explicit `width` and `height`
- [ ] Use `priority` only on above-the-fold hero images
- [ ] Upload scooter images already resized (max 1600px wide)
- [ ] Enable AVIF + WebP in `next.config.ts`

## 20.2 — Font Loading

- [ ] `next/font` with `display: 'swap'`
- [ ] Subset to Latin
- [ ] Preload only the weights actually used

## 20.3 — Route Splitting

- [ ] Admin bundle split from public bundle (separate route groups)
- [ ] Heavy components (calendar, charts) loaded via `next/dynamic`

## 20.4 — Caching

- [ ] Public GETs use `unstable_cache` with appropriate tags and TTLs
- [ ] `revalidateTag('scooters')` on brand/model admin edits
- [ ] `revalidateTag('technicians')` on approvals

## 20.5 — Skeleton States

- [ ] Every async page has a `loading.tsx` with skeleton matching final layout
- [ ] Prevent layout shift (reserve space for images and text)

## 20.6 — Animations

- [ ] All transitions 150–300 ms
- [ ] `prefers-reduced-motion` kills animations
- [ ] Use `framer-motion` sparingly (only where it adds real value)

## 20.7 — Polish Pass

- [ ] Consistent spacing across pages (design-system token scale)
- [ ] Consistent button hierarchy (primary / secondary / ghost)
- [ ] Consistent empty states with illustrations
- [ ] Consistent error states with retry CTA
- [ ] Consistent toasts for success/failure feedback
- [ ] Hover states on every interactive element
- [ ] Focus rings visible and pleasant
- [ ] 404 page branded
- [ ] 500 page branded

## 20.8 — Microcopy Review

- [ ] Every Spanish string reviewed for tone: friendly, direct, local-Uruguayan
- [ ] Avoid English words when a natural Spanish alternative exists
- [ ] Consistent capitalization (sentence case)

## 20.9 — Lighthouse Targets

- [ ] Mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95
- [ ] Desktop: Performance ≥ 95
- [ ] Run on: home, scooters list, scooter detail, services, technicians list, technician detail, booking wizard, dashboard

## Exit Criteria

- [ ] All Lighthouse targets hit
- [ ] No layout shift (CLS < 0.1)
- [ ] TTI < 3.5s on 4G
- [ ] Polish pass complete and visually reviewed against design system
