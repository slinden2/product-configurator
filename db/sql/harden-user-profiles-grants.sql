-- Defense in depth for `user_profiles` (see the policy comment in
-- db/schemas/user-profiles.ts).
--
-- Supabase grants the API roles full DML on every table by default. The table's
-- RLS carries no write policy, so writes through the Supabase API are already
-- denied — this REVOKE removes the underlying privilege as well, so a future
-- policy added by mistake cannot silently re-open administrative columns
-- (`role`, `is_active`, `deactivated_at`, `manager_id`) to self-service edits.
--
-- Reads stay granted: the "Allow authenticated users to select all profiles"
-- policy is the one Supabase-API path this table still serves.
--
-- Server Actions are unaffected: Drizzle connects as `postgres`, which owns the
-- table and bypasses both grants and RLS.
--
-- drizzle-kit push manages policies but NOT grants, so this file is the durable
-- record. Apply once per environment (dev + prod):
--   psql "$DATABASE_URL" -f db/sql/harden-user-profiles-grants.sql
-- It is idempotent.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_profiles FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_profiles FROM authenticated;
