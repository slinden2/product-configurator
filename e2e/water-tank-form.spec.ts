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
    await page.waitForLoadState("networkidle");

    // Second tank — Tank 1's edit form is still visible, so its selects occupy index 0.
    // Use triggerIndex 1 to target the new add form's fields.
    await page.getByRole("button", { name: "Aggiungi serbatoio" }).click();
    await selectRadixOption(page, "Tipo di serbatoio", "2500L", 1);
    await selectRadixOption(page, "Uscite no rubinetto", "1", 1);
    await page.getByRole("button", { name: "Aggiungi" }).click();
    await expect(page.getByText("Serbatoio creato.")).toBeVisible();

    await page.waitForLoadState("networkidle");

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
    // Wait for revalidatePath refetch to complete before interacting with the edit form
    await page.waitForLoadState("networkidle");

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
    await page.waitForLoadState("networkidle");

    // Delete: button has aria-label "Elimina Serbatoio 1"
    await page.getByRole("button", { name: "Elimina Serbatoio 1" }).click();

    // Wait for the dialog animation to complete before confirming
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Elimina" }).click();

    await expect(page.getByText("Serbatoio 1 eliminato.")).toBeVisible();
    // The tank form is gone from the page (exact: true avoids matching the toast text)
    await expect(
      page.getByText("Serbatoio 1", { exact: true }),
    ).not.toBeVisible({
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
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Elimina Serbatoio 1" }).click();

    // Wait for the dialog animation to complete before interacting
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();

    // Cancel in the dialog
    await dialog.getByRole("button", { name: "Annulla" }).click();

    // Dialog should be gone before we check the rest
    await expect(dialog).not.toBeVisible();

    // Tank form is still present
    await expect(page.getByText("Serbatoio 1", { exact: true })).toBeVisible();
    await expect(
      page.getByText("Serbatoio 1 eliminato.", { exact: true }),
    ).not.toBeVisible({
      timeout: 2000,
    });
  });
});
