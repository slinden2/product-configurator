import { test, expect } from "@playwright/test";
import { fillMinimalForm, selectRadixOption } from "./helpers";

test.describe("Configuration form — E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/configurazioni/nuova");
  });

  // ─── Regression tests for inv_pump_outlet reset bug ───────────────────────

  test("regression: creates config with non-inverter pump (outlets default to 0)", async ({
    page,
  }) => {
    // This test guards against the bug where inv_pump_outlet fields were reset
    // to undefined (instead of 0) when switching away from an inverter pump,
    // causing z.number() validation failure and blocking all form submissions.
    await fillMinimalForm(page, "Test E2E - Pompa boost");

    // Select water type then a non-inverter pump
    await selectRadixOption(page, "Tipo acqua 1", "Acqua di rete");
    await selectRadixOption(
      page,
      "Pompa di rilancio",
      "Pompa di rilancio 1.5kW",
      0,
    );

    await page.getByRole("button", { name: "Salva configurazione" }).click();

    // Successful insert redirects to the edit page
    await page.waitForURL(/\/configurazioni\/modifica\/\d+/);
    await expect(page).toHaveURL(/\/configurazioni\/modifica\/\d+/);
  });

  test("regression: creates config after switching from inverter to non-inverter pump", async ({
    page,
  }) => {
    // Regression: if the user selects an inverter pump (triggering outlet fields),
    // then switches to a non-inverter pump, outlets must reset to 0 — not undefined.
    await fillMinimalForm(page, "Test E2E - Switch pompa");

    await selectRadixOption(page, "Tipo acqua 1", "Acqua di rete");

    // 1. Select inverter pump → outlet fields appear
    await selectRadixOption(
      page,
      "Pompa di rilancio",
      "Pompa inv. 3kW 200l/min",
      0,
    );
    await expect(page.getByLabel("Uscite Dosatron")).toBeVisible();
    await expect(page.getByLabel("Uscite idropulitrice")).toBeVisible();

    // Set outlets to satisfy the >= 2 total requirement
    await selectRadixOption(page, "Uscite Dosatron", "1");
    await selectRadixOption(page, "Uscite idropulitrice", "1");

    // 2. Switch to non-inverter pump → outlet fields disappear
    await selectRadixOption(
      page,
      "Pompa di rilancio",
      "Pompa di rilancio 1.5kW",
      0,
    );
    await expect(page.getByLabel("Uscite Dosatron")).not.toBeVisible();
    await expect(page.getByLabel("Uscite idropulitrice")).not.toBeVisible();

    // 3. Submit — must succeed (outlets are 0, not undefined)
    await page.getByRole("button", { name: "Salva configurazione" }).click();
    await page.waitForURL(/\/configurazioni\/modifica\/\d+/);
    await expect(page).toHaveURL(/\/configurazioni\/modifica\/\d+/);
  });

  // ─── Happy path ────────────────────────────────────────────────────────────

  test("happy path: creates config with inverter pump and 2 outlets", async ({
    page,
  }) => {
    await fillMinimalForm(page, "Test E2E - Pompa inverter");

    await selectRadixOption(page, "Tipo acqua 1", "Acqua di rete");
    await selectRadixOption(
      page,
      "Pompa di rilancio",
      "Pompa inv. 3kW 200l/min",
      0,
    );

    // Set 2 total outlets (1 Dosatron + 1 idropulitrice)
    await selectRadixOption(page, "Uscite Dosatron", "1");
    await selectRadixOption(page, "Uscite idropulitrice", "1");

    await page.getByRole("button", { name: "Salva configurazione" }).click();
    await page.waitForURL(/\/configurazioni\/modifica\/\d+/);
    await expect(page).toHaveURL(/\/configurazioni\/modifica\/\d+/);
  });

  test("happy path: creates config and edits it successfully", async ({
    page,
  }) => {
    // Create a new config
    await fillMinimalForm(page, "Test E2E - Edit");
    await page.getByRole("button", { name: "Salva configurazione" }).click();
    await page.waitForURL(/\/configurazioni\/modifica\/\d+/);

    // Now on the edit page — change a field and save
    await selectRadixOption(page, "Lunghezza rotaie", "25 metri");
    await page.getByRole("button", { name: "Salva configurazione" }).click();

    await expect(page.getByText("Configurazione aggiornata.")).toBeVisible();
  });
});
