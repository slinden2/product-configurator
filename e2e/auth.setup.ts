import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Page, test as setup } from "@playwright/test";
import { DEV_PASSWORD, E2E_USER_EMAIL } from "../db/seed-constants";
import { authStatePath, E2E_ROLE_EMAILS, type E2eRole } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultAuthFile = path.join(__dirname, ".auth/user.json");

// All accounts are provisioned by `npm run seed` (shared DEV_PASSWORD) and
// recreated by `npm run seed:reset`. Credentials are shared via
// db/seed-constants.ts — no .env setup required. Login lands on the "/"
// role-aware dashboard.

async function logInAndSave(page: Page, email: string, file: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Accedi" }).click();
  await page.waitForURL("/");

  await page.context().storageState({ path: file });
}

// Default state used by the form specs (role: ENGINEER) — unchanged.
setup("authenticate", async ({ page }) => {
  await logInAndSave(page, E2E_USER_EMAIL, defaultAuthFile);
});

// Per-role states for the journey/routing specs. Each setup test runs in its
// own fresh context, so the logins cannot bleed into one another.
const ROLES: E2eRole[] = ["agent", "manager", "engineer", "admin"];
for (const role of ROLES) {
  setup(`authenticate ${role}`, async ({ page }) => {
    await logInAndSave(page, E2E_ROLE_EMAILS[role], authStatePath(role));
  });
}
