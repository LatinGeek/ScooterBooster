# Phase 00 — MCP Setup (Firebase + Vercel)

> **Goal:** Give Alan direct, autonomous access to Firebase and Vercel via Model Context Protocol (MCP) servers so he can deploy, inspect data, manage env vars, and trigger builds without human copy-paste.
> **Why first:** Every subsequent phase assumes Alan can reach prod infra directly. Set this up once, reap the benefits for the entire build.

## 0.1 — Prerequisites

- [ ] Confirm Node.js ≥ 20.15.0 (`node -v`)
- [ ] Confirm npm ≥ 10.7.0 (`npm -v`)
- [ ] Confirm `git` installed and repo initialized
- [ ] Install GitHub CLI (`gh`) and authenticate: `gh auth login`
- [ ] Create a GitHub repo `scooterbooster/scooterbooster` and push initial commit
- [ ] Verify your AI client supports MCP (Claude Desktop, Cursor, Claude Code, etc.)

## 0.2 — Google Cloud / Firebase Project

- [ ] Go to [console.firebase.google.com](https://console.firebase.google.com) and create a project named `scooterbooster-prod`
- [ ] Also create `scooterbooster-dev` for development
- [ ] Enable **Authentication** → Sign-in method → **Google** (only)
- [ ] Enable **Cloud Firestore** in Native mode, region: `southamerica-east1` (São Paulo, closest to UY)
- [ ] Enable **Cloud Storage** for future image uploads
- [ ] Register a Web app for each project and copy the config to `.env.local` (dev) and Vercel (prod)
- [ ] Under **Project Settings → Service Accounts**, generate a new private key JSON for each project; store as `firebase-admin-dev.json` and `firebase-admin-prod.json` **outside the repo** (e.g. `~/.secrets/scooterbooster/`)

## 0.3 — Firebase CLI

- [ ] Install: `npm install -g firebase-tools`
- [ ] Login: `firebase login`
- [ ] Initialize in the repo root: `firebase init` → select Firestore, Hosting (skip), Storage, Emulators
- [ ] Choose `scooterbooster-dev` as default project
- [ ] Add alias: `firebase use --add scooterbooster-prod --alias prod`
- [ ] Commit `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`

## 0.4 — Firebase MCP Server

- [ ] Install Firebase MCP server: `npm install -g @gannonh/firebase-mcp` (or the current official/community server)
- [ ] Generate a service account key for `scooterbooster-dev`
- [ ] Add the MCP server to your AI client's MCP config (see per-client snippets below)

**Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json` on Windows):
```json
{
  "mcpServers": {
    "firebase-scooterbooster": {
      "command": "npx",
      "args": ["-y", "@gannonh/firebase-mcp"],
      "env": {
        "SERVICE_ACCOUNT_KEY_PATH": "C:\\Users\\<you>\\.secrets\\scooterbooster\\firebase-admin-dev.json",
        "FIREBASE_STORAGE_BUCKET": "scooterbooster-dev.firebasestorage.app"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json` in the repo):
```json
{
  "mcpServers": {
    "firebase-scooterbooster": {
      "command": "npx",
      "args": ["-y", "@gannonh/firebase-mcp"],
      "env": {
        "SERVICE_ACCOUNT_KEY_PATH": "${HOME}/.secrets/scooterbooster/firebase-admin-dev.json",
        "FIREBASE_STORAGE_BUCKET": "scooterbooster-dev.firebasestorage.app"
      }
    }
  }
}
```

- [ ] Restart the AI client
- [ ] Verify MCP tools are available (ask the agent to list Firestore collections)
- [ ] Write a sample doc to `users` via MCP and verify in Firebase console
- [ ] Delete the sample doc

## 0.5 — Vercel Project

- [ ] Create account at [vercel.com](https://vercel.com) (use the same Google account)
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Login: `vercel login`
- [ ] Link the repo: `vercel link` → choose team + project name `scooterbooster`
- [ ] Set the production domain to `scooterbooster.uy` (DNS config in Phase 21)
- [ ] Create a Vercel access token: [vercel.com/account/tokens](https://vercel.com/account/tokens) → name it `alan-mcp` → store in `~/.secrets/scooterbooster/vercel-token.txt`

## 0.6 — Vercel MCP Server

- [ ] Install the Vercel MCP server (use the official Vercel-hosted MCP or a community server like `@vercel/mcp-adapter` / `mcp-vercel`)
- [ ] Add to AI client MCP config:

```json
{
  "mcpServers": {
    "vercel-scooterbooster": {
      "command": "npx",
      "args": ["-y", "mcp-vercel"],
      "env": {
        "VERCEL_API_TOKEN": "<paste token>",
        "VERCEL_TEAM_ID": "<team id from vercel>",
        "VERCEL_PROJECT_ID": "<project id>"
      }
    }
  }
}
```

- [ ] Restart the AI client
- [ ] Verify by asking the agent to list recent deployments
- [ ] Verify agent can read env vars (dev/preview/prod scopes)
- [ ] Trigger a test redeploy via MCP and confirm it appears in the Vercel dashboard

## 0.7 — GitHub MCP (Optional but Recommended)

- [ ] Install GitHub MCP: follow [github.com/github/github-mcp-server](https://github.com/github/github-mcp-server)
- [ ] Create a fine-grained PAT scoped to the `scooterbooster` repo
- [ ] Add to AI client MCP config
- [ ] Verify agent can list issues, open PRs, and read CI status

## 0.8 — Secrets Hygiene

- [ ] Confirm `~/.secrets/scooterbooster/` is **not** in any git-tracked path
- [ ] Confirm `.env*` is gitignored (except `.env.example`)
- [ ] Add pre-commit hook via `husky` + `lint-staged` to block accidental secret commits (install in Phase 01)
- [ ] Document where each secret lives in `knowledge-base/integrations/secrets-map.md` (create this file)

## 0.9 — Connectivity Smoke Test

Ask Alan via the AI client to perform these in one session:

- [ ] "List all Firestore collections" → expect empty result (project is new)
- [ ] "Create a test doc in `_smoke_test` with `{ ok: true }`" → verify in console
- [ ] "Delete the `_smoke_test` collection" → verify
- [ ] "List the latest 3 Vercel deployments for scooterbooster" → expect to see at least the initial one
- [ ] "Show me the VERCEL env vars for production" → expect the ones you've set (or empty)
- [ ] Record any MCP server names, paths, or quirks in `knowledge-base/learnings.md`

## Exit Criteria

- [ ] Alan can read/write Firestore (dev) via MCP
- [ ] Alan can list/trigger Vercel deployments via MCP
- [ ] Both `scooterbooster-dev` and `scooterbooster-prod` exist in Firebase
- [ ] Vercel project linked to the GitHub repo with CI auto-deploy on `main`
- [ ] All tokens and service-account keys are stored outside the repo
- [ ] MCP config committed (without secrets) as `.cursor/mcp.json.example` for reference
