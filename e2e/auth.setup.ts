import { test as setup } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, ".auth/user.json");

// Prerequisites:
// 1. Create the E2E user in the Supabase dashboard: Authentication > Users > Add user
//    Email: e2e-test@itecosrl.com (or the value of E2E_USER_EMAIL)
// 2. Set E2E_USER_EMAIL and E2E_USER_PASSWORD in your .env file
//
// The user_profiles row is auto-created on first login (role: SALES).

setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL;
  const password = process.env.E2E_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_USER_EMAIL and E2E_USER_PASSWORD must be set in .env to run E2E tests",
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Accedi" }).click();
  await page.waitForURL("**/configurations");

  await page.context().storageState({ path: authFile });
});
