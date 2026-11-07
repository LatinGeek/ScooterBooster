# Firmware Patcher UI report (W4 / FP-UI) — FINAL UI VERIFICATION

Base HEAD `dec672512e1a91f5ec75dc6ddd576721f0a0a455`; feature commit `20b3d124c7ff849ef04c6f017052c204cee589d9`
(`feat: add firmware patcher UI, pages and nav`). This pass verified the work and refreshed evidence;
no UI source change was needed (the 375px result overflow was already fixed in `20b3d124`).

## Delivered (in `20b3d124`)

- `src/components/firmware-patcher/**` (panel, dropzone, detection, patch form, result, client, state, flags, api-types)
- Pages: admin + technician (flag → notFound, auth redirect, role guard)
- Nav "Parcheador" (Cpu) in both layouts, gated on `NEXT_PUBLIC_*` flag only (server flag not readable client-side; pages check both)
- Unit/component tests: 42 passing
- `tests/e2e/firmware-patcher.spec.ts` (5 tests; written, not weakened)

## Verification results (this pass)

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npx next typegen && npm run type-check` | exit 0 |
| Firmware tests | `npx vitest run src/components/firmware-patcher` | 3 files, 42/42 passed, exit 0 |
| ESLint (touched files) | `npx eslint src/components/firmware-patcher src/app/admin/firmware-patcher src/app/dashboard/technician/firmware-patcher src/app/admin/layout.tsx src/app/dashboard/technician/layout.tsx tests/e2e/firmware-patcher.spec.ts` | exit 0, no findings |
| Full lint | `npm run lint` | 14 errors / 5 warnings, exit 1 — **matches baseline** |
| Full test suite | `npm test` | 71/72 files passed; 293/295 tests passed; 2 failures in `src/lib/uruguay-locations.test.ts` — **matches baseline** |
| E2E spec | `npx playwright test tests/e2e/firmware-patcher.spec.ts --list` | 5 tests collected, exit 0; **execution UNVERIFIED** (see below) |

### Visual re-check (375 / 768 / 1280)

Method: temporary `/fp-preview` route rendering the panel inside the technician dashboard shell
(same layout constraints: `max-w-6xl`, 60-unit sidebar at ≥md, `min-w-0` main), API mocked with
`page.route` (approved response shapes), synthetic 2 KiB `.bin` and a 4-byte patched response —
no real firmware. Route and driver script were deleted after the run. The temporary route was not
committed.

| Viewport | Page overflow initial/form/result | Panel/result descendant overflow | Download button right edge | Patch table |
| --- | --- | --- | --- | --- |
| 375 | 0 / 0 / 0 | 0 / 0 / 0 | 334 of 375 (0 overflow) | scrolls locally 291 → 512 |
| 768 | 0 / 0 / 0 | 0 / 0 / 0 | 690 of 768 (0 overflow) | scrolls locally 396 → 512 |
| 1280 | 0 / 0 / 0 | 0 / 0 / 0 | 762 of 1280 (0 overflow) | no local scroll needed 764 |

- No page/body horizontal scroll at any viewport; the former 35px result-view overflow is gone
  (download button wraps with `max-w-full whitespace-normal break-all`).
- Focus after detect = "2. Modelo detectado"; after patch = "4. Firmware parcheado".
- 375 was run with `prefers-reduced-motion: reduce`: spinner animation `none`; 768/1280 `spin`.
- No page errors/console exceptions during the flow.
- Evidence: `build-plan/firmware-patcher/reports/ui-evidence/{375,768,1280}-{1-initial,2-form,3-result}.png`
  and `visual-check.json` (machine-readable metrics above).

## API shape confirmation

Compared the UI mirror (`src/components/firmware-patcher/api-types.ts`, `client.ts`) against the
approved API in branch `LatinGeek/fp-api` commit `a62f1c3` (`docs/firmware-patcher.md` §7 and
`src/lib/firmware-patcher/server/contract.ts`). Confirmed, no breaking mismatch:

- `GET /capabilities` → `data.models[] = { code, displayName, family, patches[] }`; each patch has
  `code, label?, status, kind, min?, max?, step?, default?`. UI matches; additive
  `enabled`, `limits.maxDurationSeconds`, `patchOrder`, `roleAccess` are ignored safely.
- `POST /detect` → `{ detection, availablePatches[] }` (plus additive `supported`, `message`,
  `inputSha256`, `size`); UI reads `detection` + `availablePatches` and matches field shapes.
  Server `detection.score: number` is a valid subset of the UI's `number | null`.
- `POST /patch` → multipart `file`, `selection` JSON `[{ code, value }]` (real JSON booleans),
  `allowExperimental` and `fullDump` strictly `"true"` / `"false"`. Binary response headers:
  `X-Firmware-Patch-Log` = base64url JSON `[{name, offset, before, after}]`,
  `X-Firmware-Patch-Log-Truncated: 1`; UI decode/fallback matches.
- No UI change required for the contract.

## E2E status: UNVERIFIED

The spec is valid and collects 5 tests, but cannot run in this workspace because there is **no
`.env.local`** and no Firebase credentials in the environment:

- `tests/e2e/support/auth.ts` needs `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`,
  `FIREBASE_ADMIN_PRIVATE_KEY` to mint custom tokens and write the `users` profile.
- The app build needs `NEXT_PUBLIC_FIREBASE_*` client config.
- Both `NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED=true` and `FIRMWARE_PATCHER_ENABLED=true` must be set
  at build time (the spec self-skips otherwise).

No test was skipped, deleted, or weakened. To finish E2E: provide a dev Firebase service account
and client config in `.env.local`, then run
`NEXT_PUBLIC_FIRMWARE_PATCHER_ENABLED=true FIRMWARE_PATCHER_ENABLED=true npx playwright test tests/e2e/firmware-patcher.spec.ts`.

## Environment

- `node_modules` was usable for all checks; **no** `npm ci` was needed. C: free ≈ 4.55 GB at the
  end of the run (previous ENOSPC incident is not recurring here).
- No real firmware, secrets, or service-account material was added to the repo; the local dummy
  key used only for the temporary preview server lives outside the workspace and is not committed.

## Remaining

- E2E execution (above) — the only open UI verification item.
- Integration owner: consume `20b3d124` (or this successor evidence/report commit) behind both flags.
