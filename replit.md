# VisaCRM

A full-stack Travel Agency CRM for managing visa leads, walk-ins, payments, documents, team, and reports — built with React + Vite (frontend) and Express (backend proxy).

## Run & Operate

- `pnpm --filter @workspace/visa-crm run dev` — run the frontend (port 19693)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, shadcn/ui, TanStack Query, Wouter, Recharts
- Backend: Express 5, Supabase (anon key proxy)
- Auth/DB/Storage: Supabase (direct from frontend)
- Validation: Zod (`zod/v4`)

## Where things live

- `artifacts/visa-crm/` — React frontend (all 12 pages)
- `artifacts/api-server/` — Express backend (Supabase proxy routes)
- `artifacts/visa-crm/src/pages/` — all page components
- `artifacts/visa-crm/src/hooks/` — React Query hooks (use-leads, use-dashboard, use-services, use-team)
- `artifacts/visa-crm/src/context/AuthContext.tsx` — auth + permissions
- `artifacts/visa-crm/src/lib/supabase.ts` — Supabase client (handles project ref or full URL)
- `artifacts/visa-crm/src/utils/gst.ts` — GST calculation utilities (18% GST)
- `artifacts/api-server/src/routes/` — Express routes (leads, services, profiles, roles, dashboard)

## Architecture decisions

- Frontend talks to Supabase DIRECTLY via the JS client (not via API hooks) for all data — React Query hooks in `hooks/` wrap Supabase calls
- Backend API routes also proxy Supabase using the anon key (for server-side operations)
- `VITE_SUPABASE_URL` secret stores just the Supabase project ref (`kracvxaczwfukqaliffe`) — the frontend lib/supabase.ts auto-constructs the full URL
- Supabase client is initialized with a placeholder URL fallback so the app doesn't crash if credentials are missing
- Role-based permissions are stored as a `permissions: string[]` array on each role; `can()` helper checks them

## Product

- **Login** — Supabase email/password auth
- **Dashboard** — KPI cards, recent leads table, leads-by-source chart, agent performance
- **Command Center** — Admin MIS: full financials, revenue trend, pending balances, WhatsApp reminders
- **Leads** — Full leads table with filters, "New Lead" 4-tab form (PAX/Service/Payment/Assign), CSV export, WhatsApp links
- **Lead Detail** — PAX info, trip info, status change, notes, payment recording, document upload (Supabase Storage), history
- **Walk-ins** — Today/week/all walk-in tracking, quick register modal, WhatsApp links
- **Payments** — Revenue + GST summary cards, payment filter, WhatsApp balance reminders, CSV export
- **Services** — Service cards grouped by category, add/edit service modal
- **Reports** — Date-range filter, 12-month trend chart, breakdown by source/status/service, agent performance chart, CSV exports
- **Team** — Team member cards with avatar color pickers, edit modal, role assignment
- **Roles** — Permission matrix with group toggles, create/edit roles
- **Activity Log** — Filterable audit trail by type/date

## User preferences

- Primary color: #1A5FB4 (blue)
- GST rate: 18%
- WhatsApp link format: wa.me/{phone}?text={encoded_message}
- Status colors: Under Process=amber, Submitted=blue, Completed=green, Cancelled=gray

## Gotchas

- `VITE_SUPABASE_URL` secret is the project ref only (`kracvxaczwfukqaliffe`), not the full URL — the supabase.ts lib auto-prefixes `https://` and suffixes `.supabase.co`
- The Supabase DB schema must be run manually in the Supabase SQL editor before the app will work
- API server uses lazy `getSupabase()` pattern to avoid top-level initialization errors
- CSS `@import url(...)` must come BEFORE `@import "tailwindcss"` in index.css
- Frontend uses Supabase directly; the Express backend routes are available but the primary data path is direct Supabase from frontend

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
