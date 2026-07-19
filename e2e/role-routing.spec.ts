import { expect, type Locator, test } from "@playwright/test";
import { openPageAs } from "./helpers";

// "/" is the role-aware dashboard for every role — there are no per-role
// landing redirects (only unauthenticated → /login). These are rendering
// smokes per role plus the ENGINEER offer-area exclusion.
//
// Selector notes: page content is asserted through the `main` locator (see
// openPageAs). Queue-card titles ("Bozze da completare", "Da prendere in
// carico", …) are unique within it. The pipeline row labels
// "Offerte"/"Configurazioni" collide with navbar links, so they are scoped to
// the section headed "Pipeline"; chip labels (e.g. "Bozza") appear in both
// rows and are never asserted.
test.describe("Role routing", () => {
  function pipelineSection(main: Locator) {
    return main.locator("section").filter({
      has: main.page().getByRole("heading", { name: "Pipeline" }),
    });
  }

  test("SALES agent dashboard shows offer queues and offer pipeline only", async ({
    browser,
  }) => {
    const { context, page, main } = await openPageAs(browser, "agent");
    try {
      await page.goto("/");
      await expect(
        main.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      // Offer queue cards
      await expect(main.getByText("Bozze da completare")).toBeVisible();
      await expect(main.getByText("In attesa di esito")).toBeVisible();
      // No technical queue, no margin card
      await expect(main.getByText("Da prendere in carico")).toHaveCount(0);
      await expect(main.getByText("In lavorazione")).toHaveCount(0);
      await expect(main.getByText("Decisioni margine")).toHaveCount(0);
      // Offer pipeline row only
      const pipeline = pipelineSection(main);
      await expect(
        pipeline.getByText("Offerte", { exact: true }),
      ).toBeVisible();
      await expect(
        pipeline.getByText("Configurazioni", { exact: true }),
      ).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test("ENGINEER dashboard shows technical queues and config pipeline only", async ({
    browser,
  }) => {
    const { context, page, main } = await openPageAs(browser, "engineer");
    try {
      await page.goto("/");
      await expect(
        main.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      // Technical queue cards
      await expect(main.getByText("Da prendere in carico")).toBeVisible();
      await expect(main.getByText("In lavorazione")).toBeVisible();
      // No offer queue, no margin card
      await expect(main.getByText("Bozze da completare")).toHaveCount(0);
      await expect(main.getByText("In attesa di esito")).toHaveCount(0);
      await expect(main.getByText("Decisioni margine")).toHaveCount(0);
      // Config pipeline row only
      const pipeline = pipelineSection(main);
      await expect(
        pipeline.getByText("Configurazioni", { exact: true }),
      ).toBeVisible();
      await expect(pipeline.getByText("Offerte", { exact: true })).toHaveCount(
        0,
      );
    } finally {
      await context.close();
    }
  });

  test("ADMIN dashboard shows both queue sets plus the margin card", async ({
    browser,
  }) => {
    const { context, page, main } = await openPageAs(browser, "admin");
    try {
      await page.goto("/");
      await expect(
        main.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
      await expect(main.getByText("Bozze da completare")).toBeVisible();
      await expect(main.getByText("Da prendere in carico")).toBeVisible();
      // The margin card streams in via Suspense and its fallback skeleton
      // repeats the same title, so two matches can coexist mid-swap; with
      // pending decisions the resolved title also carries a count badge
      // ("Decisioni margine1"). Substring + .first() holds in every state.
      await expect(main.getByText("Decisioni margine").first()).toBeVisible();
      const pipeline = pipelineSection(main);
      await expect(
        pipeline.getByText("Offerte", { exact: true }),
      ).toBeVisible();
      await expect(
        pipeline.getByText("Configurazioni", { exact: true }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("ENGINEER is redirected from the offers list to the dashboard", async ({
    browser,
  }) => {
    const { context, page, main } = await openPageAs(browser, "engineer");
    try {
      await page.goto("/offerte");
      await expect(page).toHaveURL("/");
      await expect(
        main.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("ENGINEER is redirected from an offer detail to the dashboard", async ({
    browser,
  }) => {
    const { context, page, main } = await openPageAs(browser, "engineer");
    try {
      // The role gate runs before the offer fetch, so any numeric id works.
      await page.goto("/offerte/999999");
      await expect(page).toHaveURL("/");
      await expect(
        main.getByRole("heading", { name: "Dashboard" }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
