# W3 API report (FP-API)

Base: dec672512e1a91f5ec75dc6ddd576721f0a0a455 (verified, no drift).

## Delivered
- Routes: GET /capabilities, POST /detect, POST /patch under src/app/api/admin/firmware-patcher (node runtime, force-dynamic, maxDuration 10, no-store).
- Server helpers: src/lib/firmware-patcher/server/** (config, contract, engine adapter, upload, selection, audit, response, concurrency, filename, errors, route-utils, test-support).
- ratelimit: firmwarePatch 10/min, firmwarePatchDaily 100/day (Upstash + local fallback) + tests.
- .env.example flags; docs/firmware-patcher.md (Spanish).

## Wire shape (approved with UI)
capabilities.data = {enabled, upstream{version,commit}, limits{maxInputBytes,maxOutputBytes,maxPatches,maxDurationSeconds}, patchOrder, roleAccess, models[{code,displayName,family,patches[{code,label,status,kind,min,max,step,default}]}]}
detect.data = {detection{ok,model,displayName,family,container,score,hits,notes,supported}, availablePatches, supported, message, inputSha256, size}
patch: multipart file, selection (JSON [{code,value}]), allowExperimental/fullDump ("true"/"false"); unknown fields -> 400. Headers per SPEC FP-012.
Errors: 400/401/403/404/413/422/429/500/503 (503 = audit write failed, fail-closed D5).
Audit actions: firmware_patch_applied / _rejected / _failed (401/403/404/429 not audited).

## Verification (against LOCAL UNTRACKED STUBS, not committed)
Stubs: src/lib/firmware-patcher/{types,detect,capabilities}.ts, engine/index.ts - integrator must use W1/W2 real files; adapter server/engine.ts is the only seam to adjust.
- npm run type-check: PASS (NODE_OPTIONS=--max-old-space-size=4096; needed `npx next typegen` in fresh worktree).
- vitest firmware-patcher routes + ratelimit: 92/92 PASS.
- eslint on owned files: 0 problems.
- Full vitest (--maxWorkers=2): only baseline failures (uruguay-locations x2). Default worker count hit spawn UNKNOWN under load.
- Not run: lint full, build, benchmark, parity (engine pending).

## Open items
- README.md docs link not added (not owned).
- Vercel body limit (~4.5MB) vs 4MiB cap noted in docs.
- Engine field names assumed (see adapter); `unhandled errors: 2` line in full vitest run not investigated (likely worker-spawn noise).
