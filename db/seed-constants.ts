// Shared constants for database seeding and Playwright E2E auth.
// These are test-project credentials, not secrets, so they live in code
// rather than .env — the seed provisions the accounts and the E2E auth
// setup (e2e/auth.setup.ts) logs in with the same values.

export const DEV_PASSWORD = "pw";
export const E2E_USER_EMAIL = "e2e-test@itecosrl.com";

// Production Supabase project ref(s) the seed must NEVER touch. The seed wipes
// auth users and data, so it is strictly a local-development tool. Both the
// Supabase URL (https://<ref>.supabase.co) and the pooler DATABASE_URL
// (postgres.<ref>) embed the project ref, so matching either is enough.
export const BLOCKED_SUPABASE_PROJECT_REFS = [
  "uefkvtvgjwcapddjojbq", // iteco-configurator/prod
];
