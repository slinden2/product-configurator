import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Browser, BrowserContext, Locator, Page } from "@playwright/test";
import { SEED_ROLE_EMAILS } from "../db/seed-constants";

/** Short slugs for the seeded role accounts (db/seed.ts). */
export type E2eRole = "agent" | "manager" | "engineer" | "admin";

export const E2E_ROLE_EMAILS: Record<E2eRole, string> = {
  agent: SEED_ROLE_EMAILS.SALES,
  manager: SEED_ROLE_EMAILS.SALES_MANAGER,
  engineer: SEED_ROLE_EMAILS.ENGINEER,
  admin: SEED_ROLE_EMAILS.ADMIN,
};

const AUTH_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".auth",
);

/** Storage-state file for a seeded role, written by e2e/auth.setup.ts. */
export function authStatePath(role: E2eRole): string {
  return path.join(AUTH_DIR, `${role}.json`);
}

/**
 * Opens an isolated browser context + page authenticated as one of the seeded
 * role accounts. The caller owns the context and must close it (try/finally).
 *
 * `main` scopes queries to the page's main landmark. Use it for all page
 * content: during RSC streaming a section can briefly exist twice — in place
 * and in a hidden segment at the end of <body> — and page-wide queries then
 * hit strict-mode violations. Portals (toasts, dialogs) render outside
 * <main>, so assert those on `page` directly.
 */
export async function openPageAs(
  browser: Browser,
  role: E2eRole,
): Promise<{ context: BrowserContext; page: Page; main: Locator }> {
  const context = await browser.newContext({
    storageState: authStatePath(role),
  });
  const page = await context.newPage();
  return { context, page, main: page.getByRole("main") };
}

/**
 * Opens a Radix Select by its label text and clicks an option.
 * Mirrors the `selectRadixOption` helper used in Vitest unit tests.
 *
 * @param triggerIndex - use when multiple triggers share the same label (e.g., two "Pompa di rilancio" selects).
 *                       Defaults to 0 (the first matching trigger).
 */
export async function selectRadixOption(
  page: Page,
  labelText: string,
  optionText: string,
  triggerIndex = 0,
) {
  await page.getByLabel(labelText).nth(triggerIndex).click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

/**
 * Fill all form fields required for a valid minimal configuration.
 * Does not include water supply fields — add those per-test as needed.
 *
 * @param name - customer name, or `null` for an offer line: the config form
 *               hides the customer-name field there (the offer header owns
 *               the name — see GeneralSection's showClientName).
 * @param supplyType - "Mensola dritta" (default) or "Catena portacavi".
 *                     Energy chain requires a fixing type (not optional).
 */
export async function fillMinimalForm(
  page: Page,
  name: string | null,
  supplyType: "Mensola dritta" | "Catena portacavi" = "Mensola dritta",
) {
  // General
  if (name !== null) {
    // Use getByRole instead of getByLabel: during React hydration there can be a brief
    // window where both the server-rendered and client-rendered inputs coexist in the DOM.
    // getByRole only matches elements accessible in the ARIA tree (visible), so it reliably
    // resolves to exactly 1 element even during that transient overlap.
    await page.getByRole("textbox", { name: "Nome del cliente" }).fill(name);
  }

  // Brush (no brushes)
  await selectRadixOption(page, "Numero di spazzole", "No spazzole");

  // Supply
  await selectRadixOption(page, "Tipo di alimentazione", supplyType);
  if (supplyType === "Catena portacavi") {
    await selectRadixOption(page, "Tipo di fissaggio", "Linea pali");
  }
  await selectRadixOption(page, "Lato di alimentazione", "Sinistra");

  // Rail
  await selectRadixOption(page, "Tipo di rotaie", "Da tassellare");
  await selectRadixOption(page, "Tipo di tassello", "Zincato"); // shown when ANCHORED
  await selectRadixOption(page, "Lunghezza rotaie", "25 metri");

  // Touch panel
  await selectRadixOption(page, "Numero di pannelli", "1");
  await selectRadixOption(page, "Posizione touch", "Su Q.E.");
}
