import { expect, test } from "@playwright/test";
import { fillMinimalForm, openPageAs } from "./helpers";

// One journey across the full offer revision lifecycle, switching the acting
// role per step via the per-role storage states saved by auth.setup.ts
// (workers: 1, so no cross-test interference). Serial: each test depends on
// the state left by the previous one; a failure skips the rest. Re-runnable
// against the seeded dev DB without seed:reset — every run creates its own
// offer keyed by a unique customer name.
//
// Page content is asserted through the `main` locator (see openPageAs);
// toasts and confirm dialogs render in portals outside <main> and are
// asserted on `page` directly.
test.describe
  .serial("Offer lifecycle journey", () => {
    const customerName = `E2E Lifecycle ${Date.now()}`;
    let offerPath: string; // "/offerte/{id}", captured at creation
    let configId: string; // the offer line's configuration id

    test("SALES agent creates an offer, adds a line, and submits for approval", async ({
      browser,
    }) => {
      // First hit of the /offerte routes compiles them in dev mode.
      test.slow();
      const { context, page, main } = await openPageAs(browser, "agent");
      try {
        // Create the offer (DRAFT working revision).
        await page.goto("/offerte/nuova");
        await main.getByLabel("Nome cliente").fill(customerName);
        await main.getByRole("button", { name: "Crea offerta" }).click();
        await page.waitForURL(/\/offerte\/\d+$/);
        offerPath = new URL(page.url()).pathname;
        await expect(page.getByText("Offerta creata.")).toBeVisible();
        await expect(main.getByText(/Rev 1 · Bozza/)).toBeVisible();

        // Add one line configuration. The customer-name field is hidden on
        // offer lines (the offer header owns the name), hence name: null.
        await main
          .getByRole("button", { name: "Aggiungi configurazione" })
          .click();
        await page.waitForURL(/\/configurazioni\/nuova\?offerId=\d+/);
        await fillMinimalForm(page, null);
        await main
          .getByRole("button", { name: "Salva configurazione" })
          .click();
        await page.waitForURL(/\/configurazioni\/modifica\/\d+/);
        const editUrlMatch = /\/configurazioni\/modifica\/(\d+)/.exec(
          page.url(),
        );
        if (!editUrlMatch)
          throw new Error("Expected the config edit URL after saving the line");
        configId = editUrlMatch[1];
        await expect(
          page.getByText("Configurazione aggiunta all'offerta."),
        ).toBeVisible();

        // Submit the working revision (DRAFT → PENDING_APPROVAL). The confirm
        // button inside the dialog shares the trigger's label, so scope it.
        await page.goto(offerPath);
        await main
          .getByRole("button", { name: "Invia in approvazione" })
          .click();
        const dialog = page.getByRole("dialog");
        await expect(
          dialog.getByText("Inviare in approvazione?"),
        ).toBeVisible();
        await dialog
          .getByRole("button", { name: "Invia in approvazione" })
          .click();
        await expect(
          page.getByText("Revisione inviata in approvazione."),
        ).toBeVisible();
        await expect(main.getByText(/Rev 1 · In approvazione/)).toBeVisible();

        // Submission is one-way for SALES: no lifecycle controls at all…
        await expect(
          main.getByRole("button", { name: "Invia in approvazione" }),
        ).toHaveCount(0);
        await expect(main.getByRole("button", { name: "Approva" })).toHaveCount(
          0,
        );
        await expect(
          main.getByRole("button", { name: "Riporta in bozza" }),
        ).toHaveCount(0);
        // …the configuration set is frozen…
        await expect(
          main.getByRole("button", { name: "Aggiungi configurazione" }),
        ).toHaveCount(0);
        await expect(
          main.getByRole("link", { name: "Modifica", exact: true }),
        ).toHaveCount(0);
        await expect(
          main.getByRole("link", { name: "Apri", exact: true }),
        ).toBeVisible();
        // …and the line's edit page bounces to the read-only view.
        await page.goto(`/configurazioni/modifica/${configId}`);
        await page.waitForURL(`/configurazioni/visualizza/${configId}`);
      } finally {
        await context.close();
      }
    });

    test("SALES_MANAGER approves the revision", async ({ browser }) => {
      const { context, page, main } = await openPageAs(browser, "manager");
      try {
        await page.goto(offerPath);
        await expect(main.getByText(/Rev 1 · In approvazione/)).toBeVisible();
        // Approver-only controls are visible to the manager.
        await expect(
          main.getByRole("button", { name: "Riporta in bozza" }),
        ).toBeVisible();

        // PENDING_APPROVAL → APPROVED_TO_SEND
        await main.getByRole("button", { name: "Approva" }).click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.getByText("Approvare la revisione?")).toBeVisible();
        await dialog.getByRole("button", { name: "Approva" }).click();
        await expect(
          page.getByText("Revisione approvata per l'invio."),
        ).toBeVisible();
        await expect(
          main.getByText(/Rev 1 · Approvata per invio/),
        ).toBeVisible();
      } finally {
        await context.close();
      }
    });

    test("SALES agent sends the offer and records the acceptance", async ({
      browser,
    }) => {
      const { context, page, main } = await openPageAs(browser, "agent");
      try {
        await page.goto(offerPath);
        await expect(
          main.getByText(/Rev 1 · Approvata per invio/),
        ).toBeVisible();
        // Un-approve is approver-only — hidden from the agent.
        await expect(
          main.getByRole("button", { name: "Revoca approvazione" }),
        ).toHaveCount(0);

        // Send (APPROVED_TO_SEND → SENT)
        await main.getByRole("button", { name: "Invia offerta" }).click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Invia", exact: true })
          .click();
        await expect(page.getByText("Revisione inviata.")).toBeVisible();
        await expect(main.getByText(/Rev 1 · Inviata/)).toBeVisible();

        // Record customer acceptance (SENT → ACCEPTED)
        await main.getByRole("button", { name: "Accetta offerta" }).click();
        const dialog = page.getByRole("dialog");
        await expect(
          dialog.getByText("Registrare l'accettazione?"),
        ).toBeVisible();
        await dialog.getByRole("button", { name: "Accetta offerta" }).click();
        await expect(
          page.getByText(
            "Offerta accettata: configurazioni in lavorazione tecnica.",
          ),
        ).toBeVisible();
        await expect(main.getByText(/Rev 1 · Accettata/)).toBeVisible();
        // Acceptance hands the line config off to engineering.
        await expect(main.getByText("Approvato vendite")).toBeVisible();
      } finally {
        await context.close();
      }
    });

    test("ENGINEER pulls the handed-off configuration into tech review", async ({
      browser,
    }) => {
      const { context, page, main } = await openPageAs(browser, "engineer");
      try {
        // The handed-off line shows up in the technical list at SALES_APPROVED.
        await page.goto("/configurazioni");
        await expect(
          main.getByRole("heading", { name: "Configurazioni tecniche" }),
        ).toBeVisible();
        const row = main.getByRole("row").filter({ hasText: customerName });
        await expect(row).toHaveCount(1);
        await expect(row.getByText("Approvato vendite")).toBeVisible();

        // Pull it forward from the read-only view page.
        await page.goto(`/configurazioni/visualizza/${configId}`);
        // Parked at SALES_APPROVED the config is not editable.
        await expect(
          main.getByRole("link", { name: "Modifica", exact: true }),
        ).toHaveCount(0);
        await main
          .getByRole("button", { name: "Prendi in revisione tecnica" })
          .click();
        const dialog = page.getByRole("dialog");
        await expect(
          dialog.getByText("Conferma cambio di stato"),
        ).toBeVisible();
        await dialog
          .getByRole("button", { name: "Conferma", exact: true })
          .click();
        await expect(page.getByText("Stato aggiornato.")).toBeVisible();

        // IN_TECH_REVIEW: the badge updates and the config becomes editable.
        await expect(
          main.getByText("In revisione tecnica").first(),
        ).toBeVisible();
        await expect(
          main.getByRole("link", { name: "Modifica", exact: true }),
        ).toBeVisible();
      } finally {
        await context.close();
      }
    });
  });
