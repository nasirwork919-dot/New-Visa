---
name: Vercel deploy of this pnpm monorepo
description: Why Vercel builds run from the wrong artifact dir and how the deploy is wired
---

# Vercel deployment quirk for this repo

Vercel runs the build from `artifacts/api-server`, NOT the repo root. (Its project Root Directory resolves there — likely auto-detected the Express artifact.) This breaks every path-based config.

**Symptom:** "No Output Directory named X found" for every `outputDirectory` value tried (`dist`, `artifacts/visa-crm/dist`, `dist-vercel`). Also a post-build script using `process.cwd()` resolved to `/vercel/path0/artifacts/api-server/...` and threw ENOENT.

**Root cause:** `process.cwd()` during the Vercel build = `/vercel/path0/artifacts/api-server`, while `vercel.json` is read from the repo root and Vite outputs to `/vercel/path0/artifacts/visa-crm/dist`.

**Working approach:** Vercel Build Output API v3. `vercel.json` (repo root) runs `pnpm --filter @workspace/visa-crm run build && node /vercel/path0/vercel-build.js`. The script uses `__dirname` (always the repo root since the file lives there) to find `artifacts/visa-crm/dist`, then writes `.vercel/output/{config.json,static/}` to BOTH `__dirname/.vercel/output` and `process.cwd()/.vercel/output` so Vercel finds it wherever it looks. No `outputDirectory` key — Build Output API bypasses that lookup.

**Why:** relying on `outputDirectory` or `process.cwd()` is unreliable because the build CWD is the wrong artifact. `__dirname` of a repo-root script is the only stable anchor.

**How to apply:** if Vercel deploy paths misbehave, assume CWD is `artifacts/api-server`, anchor on `__dirname`, and prefer the Build Output API over `outputDirectory`. A cleaner long-term fix is to set the Vercel project Root Directory to `artifacts/visa-crm` in the dashboard.
