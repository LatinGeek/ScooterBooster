# Admin Panel - Action Plan Summary

**Created:** May 9, 2026  
**Status:** Ready for Implementation

---

## Quick Status

| Severity | Count | Fix Time | Action |
|----------|-------|----------|--------|
| 🔴 CRITICAL | 2 | 30 min | FIX TODAY |
| 🟠 HIGH | 1 | 10 min | FIX THIS WEEK |
| 🟡 MEDIUM | 4 | 1 hr 50 min | FIX BEFORE LAUNCH |
| 🟢 LOW | 2 | 18 min | FIX LATER |
| **TOTAL** | **9** | **2.5 hrs** | - |

---

## Phase 1: CRITICAL (30 minutes)
**Blocker for Production Launch**

### Issue #1: Sentry Error Tracking (15 min)
**File:** `src/instrumentation.ts`, `src/instrumentation-client.ts`, `next.config.ts`  
**Task:** Verify and complete Sentry initialization setup  
**Action:**
1. Check all Sentry config files exist
2. Ensure `onRouterTransitionStart` exported from instrumentation-client
3. Rebuild: `npm run build && npm run dev`
4. Test with `/api/_test/sentry` endpoint
5. Verify `/admin/observability` shows ✅ Connected

**Success Criteria:**
- Sentry Status shows "✅ Connected"
- Test errors appear in Sentry dashboard within 30s

---

### Issue #2: Dashboard Trend Calculation (15 min)
**File:** `src/app/admin/page.tsx` (lines 85-123)  
**Task:** Fix date extraction to include all booking formats  
**Action:**
1. Create helper function `getBookingDate()` to handle:
   - Firebase Timestamps
   - ISO strings
   - Date objects
   - Numeric timestamps
2. Add console.warn for unmatchable dates
3. Test with bookings in different date formats
4. Verify all bookings appear in 30-day trend

**Success Criteria:**
- All test bookings appear in dashboard trends
- GMV and counts match actual data
- Console shows no warnings for valid bookings

---

## Phase 2: HIGH (10 minutes)
**Strongly Recommended Before Launch**

### Issue #3: Settings Form Validation (10 min)
**File:** `src/app/admin/settings/page.tsx`  
**Task:** Add input validation to settings form  
**Action:**
1. Add client-side validation for service fee:
   - Min: 0
   - Max: 100,000
   - Type: numeric integer only
2. Display error messages in Spanish
3. Add server-side validation to `/api/admin/settings`
4. Test with invalid and valid values

**Success Criteria:**
- Negative fees rejected with error message
- Non-numeric values rejected
- Valid fees (0-100000) accepted and persisted
- Error messages in Spanish

---

## Phase 3: MEDIUM (1 hr 50 minutes)
**Important Before Growth**

### Issue #4: Error Boundaries (30 min)
**Files:** 
- Create: `src/components/ErrorBoundary.tsx`
- Modify: `src/app/admin/users/page.tsx`, `src/app/admin/bookings/page.tsx`, etc.

**Task:** Wrap data-heavy pages with error boundary  
**Action:**
1. Create `ErrorBoundary.tsx` component
2. Wrap user list, booking list, scooter list with boundary
3. Add fallback UI that shows error with refresh button
4. Test by corrupting a Firestore document

**Success Criteria:**
- Corrupted data shows error message (not blank page)
- Users can click refresh to retry
- Error message is user-friendly

---

### Issue #5: User Pagination (45 min)
**Files:** 
- Modify: `src/app/admin/users/page.tsx`
- Modify: `src/app/api/admin/users/route.ts`

**Task:** Implement cursor-based pagination (currently hardcoded at 150)  
**Action:**
1. Modify API route to support cursor pagination:
   - Load 50 users per page
   - Store last document ID as cursor
   - Use `.startAfter(lastDoc)` for next page
2. Add Next/Previous buttons to UI
3. Store cursor in URL or state
4. Test with 200+ users

**Success Criteria:**
- Page loads 50 users per page
- Next/Previous buttons work
- Can navigate through all users
- Cursor properly stored and passed

---

### Issue #6: Confirmation Dialogs (20 min)
**Files:**
- Modify: `src/app/admin/bookings/page.tsx`
- Modify: `src/app/admin/scooters/page.tsx`
- Modify: `src/app/admin/services/page.tsx`

**Task:** Add confirmation before delete/cancel actions  
**Action:**
1. Add confirmation dialog/modal before destructive actions
2. Show clear warning in Spanish
3. Require explicit confirmation
4. Test delete and cancel operations

**Success Criteria:**
- Confirmation dialog appears on delete
- Clicking Cancel prevents deletion
- Clicking Confirm completes deletion
- Dialog text in Spanish

---

### Issue #7: Audit Log Timezone (15 min)
**File:** `src/app/admin/audit/page.tsx`  
**Task:** Add timezone to audit log timestamps  
**Action:**
1. Change date format from `HH:mm:ss` to `HH:mm:ss TZ`
2. Use `toLocaleString('es-UY')` with timezone option
3. Test audit log display

**Success Criteria:**
- Timestamps show format like "14:32:15 UY"
- Timezone correctly reflects local time

---

## Phase 4: LOW (18 minutes)
**Polish & Nice-to-Have**

### Issue #8: Spanish Typos (3 min)
**File:** `src/app/admin/settings/page.tsx`  
**Task:** Fix missing accents in Spanish text  
**Action:**
1. Replace "Configuracion" → "Configuración"
2. Replace "Comision" → "Comisión"
3. Test Spanish display

**Success Criteria:**
- All Spanish text properly accented

---

### Issue #9: Data Export Feature (1 hour)
**Status:** DEFER to next sprint  
**Task:** Add CSV/Excel export for admin data (optional)

---

## Implementation Priority

### Sprint 1 (TODAY)
- Issue #1: Sentry (15 min)
- Issue #2: Dashboard Trends (15 min)
- **Total: 30 minutes** ← Quick win to unblock launch

### Sprint 2 (THIS WEEK)
- Issue #3: Settings Validation (10 min)
- Issue #4: Error Boundaries (30 min)
- Issue #6: Confirmation Dialogs (20 min)
- **Total: 60 minutes**

### Sprint 3 (BEFORE LAUNCH)
- Issue #5: User Pagination (45 min)
- Issue #7: Audit Log Timezone (15 min)
- Issue #8: Spanish Typos (3 min)
- **Total: 63 minutes**

### Later
- Issue #9: Data Export (1 hour - optional)

---

## Testing Checklist

After implementing each fix, verify using this checklist:

### Critical Phase Completion
- [ ] Sentry shows ✅ Connected on `/admin/observability`
- [ ] Dashboard includes 100% of bookings in trends
- [ ] GMV matches expected revenue

### High Phase Completion
- [ ] Settings rejects invalid fees with error message
- [ ] Settings accepts valid fees (0-100000)

### Medium Phase Completion
- [ ] Error pages show graceful error (not crash)
- [ ] User pagination works with 200+ users
- [ ] Confirmation dialogs work on delete/cancel
- [ ] Audit log shows timezone in timestamps

### Low Phase Completion
- [ ] Spanish text properly accented

---

## Risk Summary

**Overall Risk:** 🟢 LOW

All fixes are:
- ✅ Isolated to admin features only
- ✅ No user-facing changes
- ✅ No database schema changes
- ✅ No breaking changes
- ✅ Easily reversible

---

## Success Metrics

**Admin Panel Production Readiness:**

Before fixes: **6/10** (some critical gaps)  
After all fixes: **10/10** (production-ready)  
After critical fixes: **8/10** (launch-safe, with planned work remaining)

---

## Next Meeting Agenda

1. Review findings and priority
2. Assign developers to each issue
3. Set completion dates for each phase
4. Schedule QA testing after implementation
5. Plan post-launch monitoring

---

**Prepared by:** Automated Testing  
**Date:** May 9, 2026  
**Status:** Ready for team review
