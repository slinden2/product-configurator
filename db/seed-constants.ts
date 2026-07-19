// Shared constants for database seeding and Playwright E2E auth.
// These are test-project credentials, not secrets, so they live in code
// rather than .env — the seed provisions the accounts and the E2E auth
// setup (e2e/auth.setup.ts) logs in with the same values.

export const DEV_PASSWORD = "pw";
export const E2E_USER_EMAIL = "e2e-test@itecosrl.com";

// One seeded account per role — provisioned by db/seed.ts (all with
// DEV_PASSWORD) and logged in by the per-role Playwright auth setup
// (e2e/auth.setup.ts), which saves one storage state per account.
export const SEED_ROLE_EMAILS = {
  ADMIN: "admin@itecosrl.com",
  ENGINEER: "engineer@itecosrl.com",
  SALES_DIRECTOR: "director@itecosrl.com",
  SALES_MANAGER: "manager@itecosrl.com",
  SALES: "agent@itecosrl.com",
} as const;

// Production Supabase project ref(s) the seed must NEVER touch. The seed wipes
// auth users and data, so it is strictly a local-development tool. Both the
// Supabase URL (https://<ref>.supabase.co) and the pooler DATABASE_URL
// (postgres.<ref>) embed the project ref, so matching either is enough.
export const BLOCKED_SUPABASE_PROJECT_REFS = [
  "uefkvtvgjwcapddjojbq", // iteco-configurator/prod
];
