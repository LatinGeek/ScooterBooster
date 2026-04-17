# Tracker — Phase 00: MCP Setup (Firebase + Vercel)

> Status: 🚫 BLOCKED — Requires human setup of external accounts and credentials
> Last updated: 2026-04-17

## Summary

This entire phase requires Germán to manually create Firebase and Vercel projects and provide credentials. Alan cannot create external accounts or generate service account keys autonomously.

## Tasks

- [ ] 0.1 Prerequisites (git, Node, npm, GitHub CLI) — **human**
- [ ] 0.2 Firebase projects created (dev + prod) — **human**
- [ ] 0.3 Firebase CLI installed and configured — **human**
- [ ] 0.4 Firebase MCP server configured in AI client — **human**
- [ ] 0.5 Vercel project created and linked — **human**
- [ ] 0.6 Vercel MCP server configured in AI client — **human**
- [ ] 0.7 GitHub MCP (optional) — **human**
- [ ] 0.8 Secrets hygiene confirmed — **human**
- [ ] 0.9 Smoke tests run — **human**

## What Alan needs from Germán to unblock

See interrupt note filed in current session.

## Notes

- MCP setup is a one-time human task. Once done, Alan can proceed autonomously for all infra operations.
- Firebase region should be `southamerica-east1` (São Paulo — closest to Uruguay).
- Keep service account JSON files in `~/.secrets/scooterbooster/` — NEVER commit them.
