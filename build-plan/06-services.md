# Phase 06 — Service Catalog + Legal Disclaimer

> **Goal:** Present all 4 services (Speed Limit Removal, Firmware Update, Cruise Control, Maintenance) with a legally-enforced disclaimer for speed-modification services.

## 6.1 — Services List Page

- [ ] `src/app/(main)/services/page.tsx` — server component
- [ ] Fetch active services via `listActiveServices()`
- [ ] Render grid of `ServiceCard`s
- [ ] Disclaimer badge (Lucide `ShieldAlert` icon) on any service with `requiresDisclaimer: true`
- [ ] Spanish copy matches `knowledge-base/services/catalog.md`

## 6.2 — Service Detail Page

- [ ] `src/app/(main)/services/[slug]/page.tsx`
- [ ] Sections: What it is, When you need it, Estimated price range, Compatible scooters, Technicians who offer it
- [ ] "Reservar" CTA scrolls to technician list

## 6.3 — Disclaimer Modal (MANDATORY)

- [ ] `src/components/disclaimer-modal.tsx` — controlled dialog
- [ ] Full text from `knowledge-base/services/speed-limit-disclaimer.md`
- [ ] Checkbox "He leído y acepto los términos" must be checked to enable "Continuar"
- [ ] On accept, call `onAccept()` with an ISO timestamp (persist to booking later)
- [ ] Cannot be dismissed without explicit action (no outside-click close)
- [ ] Triggered automatically when selecting a service with `requiresDisclaimer === true`

## 6.4 — Disclaimer Audit Trail

- [ ] When a booking includes a disclaimer-requiring service, persist `disclaimerAcceptedAt` on the booking doc
- [ ] Add `auditLog` entry: `{ action: 'disclaimer_accepted', targetType: 'booking', targetId, metadata: { serviceId, ip, userAgent } }`
- [ ] Expose disclaimer acceptance in admin panel

## 6.5 — Service Compatibility

- [ ] Build lookup from `knowledge-base/scooters/compatibility-matrix.md`
- [ ] Either store `compatibleModelIds` on each service, OR `supportedServiceIds` on each model — choose one and stick with it
- [ ] Helper `isServiceCompatible(serviceId, modelId): boolean`

## Exit Criteria

- [ ] All 4 services live with Spanish copy
- [ ] Disclaimer modal cannot be bypassed
- [ ] `disclaimerAcceptedAt` persisted on every speed-modification booking
- [ ] Audit log entry created per acceptance
