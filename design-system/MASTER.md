# ScooterBooster — Design System MASTER

> Generated for: Electric scooter service marketplace — Uruguay
> Stack: Next.js + Tailwind CSS + shadcn/ui
> Target: Mobile-first, modern, tech-forward

---

## PATTERN: Service Marketplace + Trust Signals

- **Conversion strategy:** Trust-driven with social proof (technician ratings, review counts)
- **CTA placement:** Above fold on landing, repeated after service listings and technician cards
- **Key sections:**
  1. Hero (value proposition + primary CTA)
  2. Services overview (4 service cards)
  3. How it works (3-step process)
  4. Featured technicians (top-rated)
  5. Scooter brands (logo carousel/grid)
  6. Testimonials/reviews
  7. CTA (final booking prompt)
  8. Footer

---

## STYLE: Modern Tech + Urban Mobility

- **Keywords:** Clean, energetic, trustworthy, modern, urban, electric
- **Best for:** Mobility services, tech marketplaces, service booking platforms
- **Performance:** Excellent | **Accessibility:** WCAG AA

---

## COLORS

| Token | Hex | Name | Usage |
|-------|-----|------|-------|
| Primary | `#10B981` | Emerald Green | Brand, CTAs, active states |
| Primary Dark | `#059669` | Dark Emerald | Hover states, emphasis |
| Primary Light | `#D1FAE5` | Mint | Subtle backgrounds, badges |
| Secondary | `#3B82F6` | Electric Blue | Links, secondary actions |
| Accent | `#F59E0B` | Amber | Ratings stars, warnings, highlights |
| Background | `#FAFAFA` | Off White | Page background |
| Surface | `#FFFFFF` | White | Cards, modals, inputs |
| Surface Alt | `#F3F4F6` | Light Gray | Alternate sections, table rows |
| Text Primary | `#111827` | Near Black | Headings, body text |
| Text Secondary | `#6B7280` | Gray | Subtitles, descriptions |
| Text Muted | `#9CA3AF` | Light Gray | Placeholders, disabled |
| Border | `#E5E7EB` | Border Gray | Card borders, dividers |
| Error | `#EF4444` | Red | Error states, destructive actions |
| Success | `#10B981` | Green | Success states (same as primary) |
| Warning | `#F59E0B` | Amber | Warnings, disclaimers |

### Tailwind Config Extension
```css
/* In globals.css or tailwind theme */
@theme inline {
  --color-primary: #10B981;
  --color-primary-dark: #059669;
  --color-primary-light: #D1FAE5;
  --color-secondary: #3B82F6;
  --color-accent: #F59E0B;
}
```

### Color Notes
- Green = electric/eco/energy — aligns with electric scooters
- Blue secondary for trust and professionalism
- Amber for ratings and attention-grabbing elements
- AVOID: neon, harsh gradients, dark mode for MVP (consider later)

---

## TYPOGRAPHY

### Font Pairing: Inter + JetBrains Mono

| Role | Font | Weight | Size | Usage |
|------|------|--------|------|-------|
| H1 | Inter | 800 (ExtraBold) | 36px / 2.25rem | Page titles |
| H2 | Inter | 700 (Bold) | 30px / 1.875rem | Section headings |
| H3 | Inter | 600 (SemiBold) | 24px / 1.5rem | Card titles |
| H4 | Inter | 600 (SemiBold) | 20px / 1.25rem | Sub-sections |
| Body | Inter | 400 (Regular) | 16px / 1rem | Paragraph text |
| Body Small | Inter | 400 (Regular) | 14px / 0.875rem | Secondary text |
| Caption | Inter | 500 (Medium) | 12px / 0.75rem | Labels, badges |
| Code/Specs | JetBrains Mono | 400 | 14px / 0.875rem | Technical specs |

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
```

### Typography Notes
- Inter: clean, modern, highly legible — perfect for marketplaces
- JetBrains Mono: used sparingly for scooter specs (speed, range, battery)
- All text in Spanish — use proper accents (á, é, í, ó, ú, ñ, ü)

---

## SPACING

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px / 0.25rem | Tight inline spacing |
| sm | 8px / 0.5rem | Icon gaps, badge padding |
| md | 16px / 1rem | Component internal padding |
| lg | 24px / 1.5rem | Card padding, section gaps |
| xl | 32px / 2rem | Section padding |
| 2xl | 48px / 3rem | Major section separation |
| 3xl | 64px / 4rem | Hero/footer padding |

---

## BORDER RADIUS

| Token | Value | Usage |
|-------|-------|-------|
| sm | 6px / 0.375rem | Buttons, inputs |
| md | 8px / 0.5rem | Default |
| lg | 12px / 0.75rem | Cards |
| xl | 16px / 1rem | Large cards, modals |
| full | 9999px | Avatars, badges, pills |

---

## SHADOWS

| Token | Value | Usage |
|-------|-------|-------|
| sm | `0 1px 2px rgba(0,0,0,0.05)` | Subtle depth |
| md | `0 4px 6px -1px rgba(0,0,0,0.1)` | Cards, dropdowns |
| lg | `0 10px 15px -3px rgba(0,0,0,0.1)` | Modals, elevated cards |
| xl | `0 20px 25px -5px rgba(0,0,0,0.1)` | Popovers |

---

## KEY EFFECTS

- Hover transitions: `transition-all duration-200 ease-in-out`
- Card hover: `hover:shadow-lg hover:-translate-y-0.5`
- Button hover: `hover:bg-primary-dark` (darken primary)
- Skeleton loading: `animate-pulse bg-gray-200`
- Page transitions: subtle fade (optional, not required for MVP)

---

## COMPONENTS STYLE GUIDE

### Buttons
```
Primary:    bg-primary text-white hover:bg-primary-dark rounded-lg px-6 py-3 font-semibold
Secondary:  bg-white text-primary border border-primary hover:bg-primary-light rounded-lg px-6 py-3
Ghost:      text-secondary hover:bg-surface-alt rounded-lg px-4 py-2
Danger:     bg-red-500 text-white hover:bg-red-600 rounded-lg px-6 py-3
```

### Cards
```
Default:    bg-white border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200
Interactive: + cursor-pointer hover:-translate-y-0.5
```

### Inputs
```
Default:    bg-white border border-border rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary
Error:      border-red-500 focus:ring-red-500
```

### Badges
```
Default:    bg-primary-light text-primary-dark rounded-full px-3 py-1 text-xs font-medium
Warning:    bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-xs font-medium
```

---

## ICONS

- **Library:** Lucide React
- **Size:** 20px default (w-5 h-5), 24px for prominent (w-6 h-6), 16px for inline (w-4 h-4)
- **Stroke width:** 2 (default)
- **Key icons:**
  - Scooter/Bike: `Bike`
  - Speed: `Gauge`
  - Firmware: `Cpu`
  - Cruise Control: `Navigation`
  - Maintenance: `Wrench`
  - Star: `Star`
  - WhatsApp/Chat: `MessageCircle`
  - Calendar/Booking: `CalendarDays`
  - Location: `MapPin`
  - User: `User`
  - Settings: `Settings`
  - Search: `Search`
  - Check: `CheckCircle`
  - Warning: `AlertTriangle`

---

## RESPONSIVE BREAKPOINTS

| Breakpoint | Width | Target |
|-----------|-------|--------|
| Default | < 640px | Mobile (375px+) |
| sm | 640px | Large phone |
| md | 768px | Tablet |
| lg | 1024px | Laptop |
| xl | 1280px | Desktop |
| 2xl | 1440px | Large desktop |

### Mobile-First Rules
- Cards: 1 column on mobile, 2 on md, 3 on lg
- Navigation: hamburger menu on mobile, full nav on md+
- Hero text: centered on mobile, left-aligned on lg
- Padding: px-4 on mobile, px-6 on md, px-8 on lg

---

## PRE-DELIVERY CHECKLIST

- [ ] No emojis used as icons (use Lucide SVG icons)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Text contrast ratio ≥ 4.5:1 (WCAG AA)
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive tested: 375px, 768px, 1024px, 1440px
- [ ] All text in Spanish with proper accents
- [ ] Price formatting: UYU with dot separator ($1.650)
- [ ] WhatsApp links open in new tab with noopener noreferrer
- [ ] Speed limit disclaimer modal implemented
- [ ] Loading states for async operations (skeleton or spinner)
- [ ] Error states for failed operations (user-friendly Spanish messages)

---

## ANTI-PATTERNS (AVOID)

- ❌ Dark mode (not for MVP)
- ❌ Neon or harsh gradients
- ❌ Emojis as icons
- ❌ Comic Sans, decorative fonts
- ❌ Auto-playing videos or sounds
- ❌ Infinite scroll (use pagination)
- ❌ Aggressive pop-ups (disclaimer modal is the only required modal)
- ❌ English text in UI (all user-facing content must be in Spanish)
