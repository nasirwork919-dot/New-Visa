---
name: Team member creation
description: How admins create new team members in VisaCRM
---

# Team Member Creation

Backend: `POST /api/team-members` in `artifacts/api-server/src/routes/profiles.ts`
1. Reads `SUPABASE_SERVICE_ROLE_KEY` from env (returns 500 if missing)
2. Calls Supabase Admin Auth API (`/auth/v1/admin/users`) with service role key to create auth user
3. Upserts a profile row in the `profiles` table

Frontend: `artifacts/visa-crm/src/pages/team.tsx` — `AddMemberModal` component
- Fields: full_name, email, password, role_id, phone, avatar_color
- Sends POST to `/api/team-members`, invalidates `profiles` query on success
- Only shown to users with `can('users_manage')` permission

**Why:** Supabase auth user creation requires the service role key (admin API). The anon key cannot create users server-side. The key must NOT be exposed to the frontend — it must go through the Express backend.

**Required secret:** `SUPABASE_SERVICE_ROLE_KEY` must be set in Replit Secrets (and Vercel env vars for production). Cannot be set automatically due to security scanner restrictions on JWTs in output — user must add it manually.
