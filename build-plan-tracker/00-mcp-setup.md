# Tracker — Phase 00: MCP Setup (Firebase + Vercel)

> Status: ✅ COMPLETE
> Last updated: 2026-04-17

## Summary

Firebase dev project created, .env.local filled with dev credentials. Vercel project linked. MercadoPago credentials still needed (fill in when available).

## Tasks

- [x] 0.1 Node 22 ✓, npm 10.9 ✓, git ✓
- [x] 0.2 Firebase projects created — scooterbooster-dev ✓
- [x] 0.3 Firebase config in .env.local ✓
- [ ] 0.4 Firebase MCP server — skipped for now (not blocking)
- [x] 0.5 Vercel project linked — prj_iZGafwxQdzExikHbs3qadKvOMJb5 / team_VIU18sXii6mkmp6NhI4JpM5X
- [ ] 0.6 Vercel MCP server — VERCEL_MCP_TOKEN saved in .env.local ✓, MCP config pending
- [ ] 0.7 GitHub MCP — optional, skipped
- [x] 0.8 Secrets hygiene — .env.local gitignored ✓, .env.example updated ✓
- [ ] 0.9 Smoke tests — deferred until emulators set up in Phase 01

## Credentials on hand

- Firebase client config: ✓ in .env.local
- Firebase Admin SDK: ✓ in .env.local (extracted from service account JSON)
- Vercel token: ✓ saved as VERCEL_MCP_TOKEN
- MercadoPago: ❌ missing — needed for Phase 09

## Notes

- Build sandbox has no outbound internet — next/font/google fails. Switched to @fontsource-variable/inter npm package.
- Firebase Admin private key must be quoted in .env.local to preserve \n newlines.
- Vercel project: prj_iZGafwxQdzExikHbs3qadKvOMJb5, org: team_VIU18sXii6mkmp6NhI4JpM5X
