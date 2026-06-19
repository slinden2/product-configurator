import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as setup } from "@playwright/test";
import { DEV_PASSWORD, E2E_USER_EMAIL } from "../db/seed-constants";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, ".auth/user.json");

// The E2E account is provisioned by `npm run seed` (role: SALES) and recreated
// by `npm run seed:reset`. Credentials are shared via db/seed-constants.ts — no
// .env setup required.

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_USER_EMAIL);
  await page.getByLabel("Password").fill(DEV_PASSWORD);
  await page.getByRole("button", { name: "Accedi" }).click();
  await page.waitForURL("**/configurazioni");

  await page.context().storageState({ path: authFile });
});
