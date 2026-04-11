import type { Page } from "@playwright/test";

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
 * @param supplyType - "Mensola dritta" (default) or "Catena portacavi".
 *                     Energy chain requires a fixing type (not optional).
 */
export async function fillMinimalForm(
  page: Page,
  name: string,
  supplyType: "Mensola dritta" | "Catena portacavi" = "Mensola dritta",
) {
  // General
  // Use getByRole instead of getByLabel: during React hydration there can be a brief
  // window where both the server-rendered and client-rendered inputs coexist in the DOM.
  // getByRole only matches elements accessible in the ARIA tree (visible), so it reliably
  // resolves to exactly 1 element even during that transient overlap.
  await page.getByRole("textbox", { name: "Nome del cliente" }).fill(name);

  // Brush (no brushes)
  await selectRadixOption(page, "Numero di spazzole", "No spazzole");

  // Supply
  await selectRadixOption(page, "Tipo di alimentazione", supplyType);
  if (supplyType === "Catena portacavi") {
    await selectRadixOption(page, "Tipo di fissaggio", "Staffa a muro");
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
