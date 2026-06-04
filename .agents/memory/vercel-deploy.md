---
name: Vercel deployment setup
description: How VisaCRM is configured for Vercel deployment
---

# Vercel Deployment

- `vercel.json` at repo root — buildCommand runs `pnpm --filter @workspace/visa-crm run build`
- Output dir: `artifacts/visa-crm/dist/public`
- `BASE_PATH` env var injected as `"/"` via vercel.json env section
- `api/server.ts` at root re-exports the Express app for Vercel serverless
- `/api/*` routes → `api/server` serverless function
- All other routes → `index.html` (SPA fallback)

**Why vite.config.ts was changed:** Previously threw hard error if PORT or BASE_PATH were missing. Vercel build environment doesn't set PORT (not needed for builds). Changed to fallback: PORT defaults to 3000, BASE_PATH defaults to "/".

**Required Vercel env vars (set in Vercel dashboard):**
- `VITE_SUPABASE_URL` — Supabase project ref (e.g. `kracvxaczwfukqaliffe`)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon JWT
- `SUPABASE_SERVICE_ROLE_KEY` — for team member creation API route
