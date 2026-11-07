# Firmware Patcher UI report (W4 / FP-UI) - PARTIAL

Base HEAD dec672512e1a91f5ec75dc6ddd576721f0a0a455 (verified, no drift).

## Done
- src/components/firmware-patcher/** (panel, dropzone, detection, patch form, result, client, state, flags, api-types)
- Pages: admin + technician (flag -> notFound, auth redirect, role guard)
- Nav "Parcheador" (Cpu) in both layouts, gated on NEXT_PUBLIC flag only (server flag not readable client-side; pages check both)
- Tests: 42 passing (npx vitest run src/components/firmware-patcher); tsc --noEmit exit 0 (after `npx next typegen`); eslint on touched files clean
- tests/e2e/firmware-patcher.spec.ts written, NOT run (needs Firebase creds + flags; API mocked via page.route)
- Visual check via temporary preview route (deleted) at 375/768/1280: no overflow at 768/1280; 375 result view overflowed 35px (download button) - fixed after capture with wrapping classes, NOT re-verified. Table scrolls locally. Focus moves to detection/result headings. Reduced motion disables spinner. Screenshots: build-plan/firmware-patcher/reports/ui-evidence/

## Unverified / left
- Re-run 375 capture after the button fix; run E2E; full `npm run lint`/`npm test` baseline comparison not run
- Field-level API shapes are assumptions (see api-types.ts) - confirm with W3
- Env: disk hit 0 free during npm ci (4 ENOSPC tar errors); @firebase/util postinstall files regenerated manually; consider a clean `npm ci`
