# Tracker — Phase 07: Technicians (Onboarding, Profiles, Approval)

> Status: 🔶 PARTIAL — public pages done, technician onboarding/apply pending
> Last updated: 2026-04-18

## Tasks

- [x] Public /technicians listing — sorted by rating, approved+active only, CTA to apply
- [x] Public technician profile page (/technicians/[id]) — availability, pricing, reviews, services, WhatsApp CTA
- [ ] /technicians/apply — application form (Phase 07 next priority)
- [ ] Pending approval state for new technicians
- [ ] Admin approval/rejection flow — deferred to Phase 13
- [ ] Technician profile editing (dashboard) — deferred to Phase 12
- [ ] Availability management with date overrides — deferred to Phase 12
- [ ] Photo upload with resizing — deferred to Phase 12

## Notes

- Listings query: isApproved=true + isActive=true, sorted by rating desc
- TechnicianCard shows initials avatar (no photoURL storage yet), location, rating, bio, services, WhatsApp button
- Technician detail page shows weekly availability, pricing per service, reviews, supported brands
- Brand IDs in profile use seed format: "brand-xiaomi" — detail page strips "brand-" prefix for display
- getActiveTechnicians supports optional serviceId + brandId array-contains filters
