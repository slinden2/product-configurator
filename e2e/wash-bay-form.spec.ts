import { expect, test } from "@playwright/test";
import { fillMinimalForm, selectRadixOption } from "./helpers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Navigate to the Piste lavaggio tab of a freshly created configuration.
 * Uses straight-shelf supply (default) so energy-chain fields are absent.
 */
async function openBaysTab(page: Parameters<typeof fillMinimalForm>[0]) {
  await page.goto("/configurations/new");
  await fillMinimalForm(page, "Test E2E - Pista");
  await page.getByRole("button", { name: "Salva configurazione" }).click();
  await page.waitForURL(/\/configurations\/edit\/\d+/);
  await page.getByRole("tab", { name: "Piste lavaggio" }).click();
}

/**
 * Same as openBaysTab but with supply_type = ENERGY_CHAIN so the
 * energy-chain section is available inside each wash-bay form.
 */
async function openBaysTabEnergyChain(
  page: Parameters<typeof fillMinimalForm>[0],
) {
  await page.goto("/configurations/new");
  await fillMinimalForm(page, "Test E2E - Pista EC", "Catena portacavi");
  await page.getByRole("button", { name: "Salva configurazione" }).click();
  await page.waitForURL(/\/configurations\/edit\/\d+/);
  await page.getByRole("tab", { name: "Piste lavaggio" }).click();
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe("Wash bay form — without energy chain", () => {
  test.beforeEach(async ({ page }) => {
    await openBaysTab(page);
  });

  // ─── Add ────────────────────────────────────────────────────────────────────

  test("adds a wash bay with minimum valid data", async ({ page }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();

    // All numeric fields default to 0 / checkboxes to false — no interaction needed
    await page.getByRole("button", { name: "Aggiungi" }).click();

    await expect(page.getByText("Pista creata.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Aggiungi pista" }),
    ).toBeVisible();
  });

  test("adds a wash bay with lances and hose reel", async ({ page }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();

    await selectRadixOption(page, "Numero lance HP", "2");
    await selectRadixOption(page, "Numero lance detergente", "2");
    await selectRadixOption(page, "Numero avvolgitori", "1");
    await page.getByLabel("Prima pista").click();
    await page.getByLabel("Con pannellature").click();

    await page.getByRole("button", { name: "Aggiungi" }).click();

    await expect(page.getByText("Pista creata.")).toBeVisible();
  });

  test("adds a wash bay with pressure washer", async ({ page }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();

    await selectRadixOption(page, "Tipo idropulitrice", "21 l/min 150 bar");
    await selectRadixOption(page, "Numero idropulitrici", "1");

    await page.getByRole("button", { name: "Aggiungi" }).click();

    await expect(page.getByText("Pista creata.")).toBeVisible();
  });

  // ─── Validation ─────────────────────────────────────────────────────────────

  test("validation: pressure washer qty required when type is selected", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();

    // Select a type but leave qty at default (0 is not a valid qty option;
    // the field is only shown for values 1–2, so "Numero idropulitrici" stays unset)
    await selectRadixOption(page, "Tipo idropulitrice", "21 l/min 200 bar");

    await page.getByRole("button", { name: "Aggiungi" }).click();

    // Form must remain open — no success toast
    await expect(page.getByText("Pista creata.")).not.toBeVisible({
      timeout: 2000,
    });
    await expect(page.getByRole("button", { name: "Aggiungi" })).toBeVisible();
  });

  // ─── Edit ───────────────────────────────────────────────────────────────────

  test("edits an existing wash bay", async ({ page }) => {
    // Add a bay first
    await page.getByRole("button", { name: "Aggiungi pista" }).click();
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Pista creata.")).toBeVisible();
    await page.waitForLoadState("networkidle");

    // Edit: add lances
    await selectRadixOption(page, "Numero lance HP", "2");
    await page.getByRole("button", { name: "Salva" }).click();

    await expect(page.getByText("Pista 1 aggiornata.")).toBeVisible();
  });

  // ─── Delete ─────────────────────────────────────────────────────────────────

  test("deletes a wash bay after confirmation", async ({ page }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Pista creata.")).toBeVisible();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Elimina Pista 1" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Elimina" }).click();

    await expect(page.getByText("Pista 1 eliminata.")).toBeVisible();
    await expect(page.getByText("Pista 1", { exact: true })).not.toBeVisible({
      timeout: 2000,
    });
  });

  test("cancels deletion when dismissed in dialog", async ({ page }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Pista creata.")).toBeVisible();
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Elimina Pista 1" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Annulla" }).click();
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText("Pista 1", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Pista 1 eliminata.", { exact: true }),
    ).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe("Wash bay form — with energy chain", () => {
  test.beforeEach(async ({ page }) => {
    await openBaysTabEnergyChain(page);
  });

  // ─── Add ────────────────────────────────────────────────────────────────────

  test("energy chain fields are hidden until has_gantry is checked", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();

    // Energy chain section must not be visible before checking "Pista con portale"
    await expect(page.getByLabel("Larghezza catena")).not.toBeVisible();

    await page.getByLabel("Pista con portale").click();

    // Energy chain section appears after checking
    await expect(page.getByLabel("Larghezza catena")).toBeVisible();
  });

  test("adds a wash bay with gantry and energy chain fields", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();

    await page.getByLabel("Pista con portale").click();
    await selectRadixOption(page, "Larghezza catena", "ST072S.150.R300");
    // Required when energy chain width is set
    await selectRadixOption(page, "Cavo segnali 12G1", "1");
    await selectRadixOption(page, 'Tubo acqua 1"', "1");

    await page.getByRole("button", { name: "Aggiungi" }).click();

    await expect(page.getByText("Pista creata.")).toBeVisible();
  });

  test("adds a wash bay with all energy chain fields filled", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();

    await page.getByLabel("Pista con portale").click();
    await selectRadixOption(page, "Larghezza catena", "ST072S.200.R300");
    await page.getByLabel("Con prolunga per mensola alim.").click();
    await selectRadixOption(page, "Cavo segnali 12G1", "2");
    await selectRadixOption(page, "Cavo Profinet", "1");
    await selectRadixOption(page, 'Tubo acqua 1"', "2");
    await selectRadixOption(page, 'Tubo acqua 3/4"', "1");
    await selectRadixOption(page, 'Tubo R1 1"', "1");
    await selectRadixOption(page, 'Tubo R2 1"', "1");
    await selectRadixOption(page, 'Tubo R2 3/4" INOX', "1");
    await selectRadixOption(page, "Tubo aria 8x17", "1");

    await page.getByRole("button", { name: "Aggiungi" }).click();

    await expect(page.getByText("Pista creata.")).toBeVisible();
  });

  // ─── Validation ─────────────────────────────────────────────────────────────

  test("validation: signal cable and water tube required when chain width is set", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();

    // Set gantry + chain width but leave required cable/tube fields unset
    await page.getByLabel("Pista con portale").click();
    await selectRadixOption(page, "Larghezza catena", "ST072S.150.R300");

    await page.getByRole("button", { name: "Aggiungi" }).click();

    // Form must remain open — no success toast
    await expect(page.getByText("Pista creata.")).not.toBeVisible({
      timeout: 2000,
    });
    await expect(page.getByRole("button", { name: "Aggiungi" })).toBeVisible();
  });

  test("energy chain fields reset when has_gantry is unchecked", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Aggiungi pista" }).click();

    // Check gantry, set some fields
    await page.getByLabel("Pista con portale").click();
    await selectRadixOption(page, "Larghezza catena", "ST072S.150.R300");

    // Uncheck gantry — energy chain section should disappear
    await page.getByLabel("Pista con portale").click();
    await expect(page.getByLabel("Larghezza catena")).not.toBeVisible();

    // Bay should now save without energy chain fields
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Pista creata.")).toBeVisible();
  });
});
