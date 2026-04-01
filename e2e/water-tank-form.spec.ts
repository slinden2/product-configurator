import { test, expect } from "@playwright/test";
import { fillMinimalForm, selectRadixOption } from "./helpers";

test.describe("Water tank form", () => {
  // Each test creates a fresh config and lands on the Serbatoi tab.
  test.beforeEach(async ({ page }) => {
    await page.goto("/configurations/new");
    await fillMinimalForm(page, "Test E2E - Serbatoio");
    await page.getByRole("button", { name: "Salva configurazione" }).click();
    await page.waitForURL(/\/configurations\/edit\/\d+/);

    await page.getByRole("tab", { name: "Serbatoi" }).click();
  });

  // ─── Add ──────────────────────────────────────────────────────────────────

  test("adds a water tank with minimum valid data", async ({ page }) => {
    await page.getByRole("button", { name: "Aggiungi serbatoio" }).click();

    await selectRadixOption(page, "Tipo di serbatoio", "2000L");
    await selectRadixOption(page, "Uscite c/ rubinetto", "1");

    await page.getByRole("button", { name: "Aggiungi" }).click();

    await expect(page.getByText("Serbatoio creato.")).toBeVisible();
    // Add form closes; the "Aggiungi serbatoio" button reappears
    await expect(
      page.getByRole("button", { name: "Aggiungi serbatoio" }),
    ).toBeVisible();
  });

  test("adds a water tank with all fields filled", async ({ page }) => {
    await page.getByRole("button", { name: "Aggiungi serbatoio" }).click();

    await selectRadixOption(page, "Tipo di serbatoio", "2500L");
    await selectRadixOption(page, "Ingressi c/ galleggiante", "1");
    await selectRadixOption(page, "Ingressi no galleggiante", "1");
    await selectRadixOption(page, "Uscite c/ rubinetto", "1");
    await selectRadixOption(page, "Uscite no rubinetto", "1");
    await page.getByLabel("Con soffiante").click();

    await page.getByRole("button", { name: "Aggiungi" }).click();

    await expect(page.getByText("Serbatoio creato.")).toBeVisible();
  });

  // ─── Validation ───────────────────────────────────────────────────────────

  test("validation: type is required", async ({ page }) => {
    await page.getByRole("button", { name: "Aggiungi serbatoio" }).click();

    // Set an outlet but skip the type
    await selectRadixOption(page, "Uscite c/ rubinetto", "1");
    await page.getByRole("button", { name: "Aggiungi" }).click();

    // Form must remain open — no success toast, no redirect
    await expect(page.getByText("Serbatoio creato.")).not.toBeVisible({
      timeout: 2000,
    });
    await expect(page.getByRole("button", { name: "Aggiungi" })).toBeVisible();
  });

  test("validation: at least 1 outlet is required", async ({ page }) => {
    await page.getByRole("button", { name: "Aggiungi serbatoio" }).click();

    await selectRadixOption(page, "Tipo di serbatoio", "2000L");
    // Leave both outlet fields at their default of 0

    await page.getByRole("button", { name: "Aggiungi" }).click();

    await expect(
      page.getByText("Inserisci almeno una uscita.").first(),
    ).toBeVisible();
    // Form must remain open
    await expect(page.getByRole("button", { name: "Aggiungi" })).toBeVisible();
  });

  test("adds multiple water tanks", async ({ page }) => {
    // First tank
    await page.getByRole("button", { name: "Aggiungi serbatoio" }).click();
    await selectRadixOption(page, "Tipo di serbatoio", "2000L");
    await selectRadixOption(page, "Uscite c/ rubinetto", "1");
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Serbatoio creato.")).toBeVisible();

    // Second tank
    await page.getByRole("button", { name: "Aggiungi serbatoio" }).click();
    await selectRadixOption(page, "Tipo di serbatoio", "2500L");
    await selectRadixOption(page, "Uscite no rubinetto", "1");
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Serbatoio creato.")).toBeVisible();

    // Both tanks are shown
    await expect(page.getByText("Serbatoio 1")).toBeVisible();
    await expect(page.getByText("Serbatoio 2")).toBeVisible();
  });

  // ─── Edit ─────────────────────────────────────────────────────────────────

  test("edits an existing water tank", async ({ page }) => {
    // Add a tank first
    await page.getByRole("button", { name: "Aggiungi serbatoio" }).click();
    await selectRadixOption(page, "Tipo di serbatoio", "2000L");
    await selectRadixOption(page, "Uscite c/ rubinetto", "1");
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Serbatoio creato.")).toBeVisible();

    // Edit: change the type
    await selectRadixOption(page, "Tipo di serbatoio", "4500L");
    await page.getByRole("button", { name: "Salva" }).click();

    await expect(page.getByText("Serbatoio 1 aggiornato.")).toBeVisible();
  });

  // ─── Delete ───────────────────────────────────────────────────────────────

  test("deletes a water tank after confirmation", async ({ page }) => {
    // Add a tank first
    await page.getByRole("button", { name: "Aggiungi serbatoio" }).click();
    await selectRadixOption(page, "Tipo di serbatoio", "2000L");
    await selectRadixOption(page, "Uscite c/ rubinetto", "1");
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Serbatoio creato.")).toBeVisible();

    // Delete: button has aria-label "Elimina Serbatoio 1"
    await page.getByRole("button", { name: "Elimina Serbatoio 1" }).click();

    // Confirm in the alert dialog
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Elimina" })
      .click();

    await expect(page.getByText("Serbatoio 1 eliminato.")).toBeVisible();
    // The tank form is gone from the page
    await expect(page.getByText("Serbatoio 1")).not.toBeVisible({
      timeout: 2000,
    });
  });

  test("cancels deletion when dismissed in dialog", async ({ page }) => {
    // Add a tank first
    await page.getByRole("button", { name: "Aggiungi serbatoio" }).click();
    await selectRadixOption(page, "Tipo di serbatoio", "2000L");
    await selectRadixOption(page, "Uscite c/ rubinetto", "1");
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Serbatoio creato.")).toBeVisible();

    await page.getByRole("button", { name: "Elimina Serbatoio 1" }).click();

    // Cancel in the dialog
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Annulla" })
      .click();

    // Tank form is still present
    await expect(page.getByText("Serbatoio 1")).toBeVisible();
    await expect(page.getByText("Serbatoio 1 eliminato.")).not.toBeVisible({
      timeout: 2000,
    });
  });
});
