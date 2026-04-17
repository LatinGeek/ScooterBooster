# Phase 02 — Design System Implementation

> **Goal:** Translate `design-system/MASTER.md` into working Tailwind tokens, shadcn/ui primitives, and a component library that every subsequent page will use.

## 2.1 — Design Tokens

- [ ] Open `design-system/MASTER.md` and extract the final color palette
- [ ] Configure `src/app/globals.css` with CSS custom properties for all tokens:
  - `--color-primary`, `--color-primary-dark`, `--color-primary-light`
  - `--color-secondary`, `--color-accent`
  - `--color-success`, `--color-warning`, `--color-error`, `--color-info`
  - `--color-surface`, `--color-surface-raised`, `--color-surface-sunken`
  - `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`
  - `--color-border`, `--color-border-strong`
  - `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`
  - `--shadow-sm`, `--shadow-md`, `--shadow-lg`
- [ ] Map tokens into `@theme` block for Tailwind v4
- [ ] Confirm NO dark-mode tokens (explicit choice per design system)
- [ ] Commit tokens; verify in a test page

## 2.2 — Typography

- [ ] Import Inter + JetBrains Mono via `next/font` in `src/app/layout.tsx`
- [ ] Map to CSS vars `--font-sans` and `--font-mono`
- [ ] Define type scale classes: `text-display`, `text-h1`…`text-h4`, `text-body`, `text-caption`
- [ ] Verify WCAG AA contrast on every token pair used for text

## 2.3 — shadcn/ui Setup

- [ ] Run `npx shadcn@latest init` — choose defaults compatible with Tailwind v4
- [ ] Install core primitives: `button`, `input`, `label`, `textarea`, `select`, `checkbox`, `radio-group`, `switch`, `dialog`, `sheet`, `dropdown-menu`, `popover`, `tooltip`, `toast`, `alert`, `alert-dialog`, `badge`, `card`, `tabs`, `separator`, `skeleton`, `avatar`, `accordion`, `form`, `calendar`, `date-picker`, `table`, `pagination`, `breadcrumb`, `navigation-menu`
- [ ] Restyle each primitive to match the design system (colors, radii, shadows)

## 2.4 — Base Layout Components

- [ ] Build `src/components/layout/navbar.tsx` — responsive, mobile drawer via `sheet`
- [ ] Build `src/components/layout/footer.tsx` — links, legal, social, language note
- [ ] Build `src/components/layout/container.tsx` — max-width wrapper with responsive padding
- [ ] Build `src/components/layout/section.tsx` — vertical rhythm helper

## 2.5 — Domain Components

- [ ] `scooter-card.tsx` — brand, model, image, specs, CTA
- [ ] `service-card.tsx` — icon, title, description, starting-at price, disclaimer badge if applicable
- [ ] `technician-card.tsx` — avatar, name, rating, distance, specialties, WhatsApp button
- [ ] `review-card.tsx` — stars, reviewer, date, text
- [ ] `disclaimer-modal.tsx` — legally-enforced modal with checkbox + "Acepto" button
- [ ] `whatsapp-button.tsx` — pre-filled wa.me link with configurable message
- [ ] `price-tag.tsx` — formatted with `formatPrice()` and fee breakdown tooltip
- [ ] `rating-stars.tsx` — read-only + interactive variants
- [ ] `empty-state.tsx` — illustration + heading + CTA
- [ ] `loading-skeleton.tsx` — card/list/detail variants
- [ ] `error-state.tsx` — with retry CTA

## 2.6 — Accessibility Pass

- [ ] All interactive elements keyboard-reachable with visible focus ring
- [ ] Color contrast checked on every component
- [ ] `aria-label` on all icon-only buttons
- [ ] `prefers-reduced-motion` respected for all transitions
- [ ] Tap targets ≥ 44×44 px on mobile

## 2.7 — Component Sandbox

- [ ] Create `/src/app/(dev)/design/page.tsx` — only rendered when `NODE_ENV !== 'production'`
- [ ] Render every token, every primitive, every domain component on this page
- [ ] Use it as the visual-regression reference throughout the build

## Exit Criteria

- [ ] All tokens in `globals.css` and working in Tailwind
- [ ] shadcn/ui primitives installed and restyled
- [ ] All domain components built and rendered in the `/design` sandbox
- [ ] Every component passes accessibility checks (axe-core clean)
- [ ] No emojis used as icons anywhere
