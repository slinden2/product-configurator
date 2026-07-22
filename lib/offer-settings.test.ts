import { describe, expect, test } from "vitest";
import {
  buildDefaultInstallationItems,
  sumInstallationTotal,
} from "@/lib/offer-installation";
import {
  computeOfferSummaryExtras,
  type OfferDisplaySettings,
  parseOfferSettings,
} from "@/lib/offer-settings";

function makeSettings(
  overrides: Partial<OfferDisplaySettings> = {},
): OfferDisplaySettings {
  return {
    show_net_total_only: false,
    transport_amount: 0,
    transport_mode: "TBD",
    installation_mode: "TBD",
    installation_items: [],
    extra_discount_amount: 0,
    delivery_date: null,
    delivery_destination: "",
    payment_terms: "",
    warranty_months: 12,
    ...overrides,
  };
}

// ── buildDefaultInstallationItems ────────────────────────────────────────────

describe("buildDefaultInstallationItems", () => {
  test("returns one entry per catalog kind with included false", () => {
    const items = buildDefaultInstallationItems([
      { kind: "BASE_SYSTEM", price: "2500.00" },
    ]);
    expect(items).toEqual([
      { kind: "BASE_SYSTEM", amount: 2500, included: false },
      { kind: "HP_ROOF_BAR", amount: 0, included: false },
    ]);
  });

  test("falls back to 0 when no settings exist", () => {
    const items = buildDefaultInstallationItems([]);
    expect(items.every((i) => i.amount === 0 && !i.included)).toBe(true);
    expect(items).toHaveLength(2);
  });
});

// ── sumInstallationTotal ─────────────────────────────────────────────────────

describe("sumInstallationTotal", () => {
  test("sums only included items", () => {
    expect(
      sumInstallationTotal([
        { kind: "BASE_SYSTEM", amount: 1000, included: true },
        { kind: "HP_ROOF_BAR", amount: 500, included: false },
      ]),
    ).toBe(1000);
  });

  test("returns 0 for empty list", () => {
    expect(sumInstallationTotal([])).toBe(0);
  });
});

// ── parseOfferSettings ───────────────────────────────────────────────────────

describe("parseOfferSettings", () => {
  test("converts numeric strings and keeps stored items", () => {
    const settings = parseOfferSettings({
      show_net_total_only: true,
      transport_amount: "350.50",
      transport_mode: "SEPARATE",
      installation_mode: "INCLUDED",
      installation_items: [
        { kind: "BASE_SYSTEM", amount: 1200, included: true },
        { kind: "HP_ROOF_BAR", amount: 0, included: false },
      ],
      extra_discount_amount: "800.00",
      delivery_date: new Date("2026-09-15T00:00:00Z"),
      delivery_destination: "Cantiere di Verona",
      payment_terms: "Bonifico 60 gg",
      warranty_months: 24,
    });
    expect(settings.show_net_total_only).toBe(true);
    expect(settings.transport_amount).toBe(350.5);
    expect(settings.transport_mode).toBe("SEPARATE");
    expect(settings.installation_mode).toBe("INCLUDED");
    expect(settings.installation_items).toEqual([
      { kind: "BASE_SYSTEM", amount: 1200, included: true },
      { kind: "HP_ROOF_BAR", amount: 0, included: false },
    ]);
    expect(settings.extra_discount_amount).toBe(800);
    expect(settings.delivery_date).toEqual(new Date("2026-09-15T00:00:00Z"));
    expect(settings.delivery_destination).toBe("Cantiere di Verona");
    expect(settings.payment_terms).toBe("Bonifico 60 gg");
    expect(settings.warranty_months).toBe(24);
  });

  test("fills missing catalog kinds for pre-feature snapshots", () => {
    const settings = parseOfferSettings({
      show_net_total_only: false,
      transport_amount: "0.00",
      transport_mode: "TBD",
      installation_mode: "TBD",
      installation_items: [],
      extra_discount_amount: "0.00",
      delivery_date: null,
      delivery_destination: null,
      payment_terms: null,
      warranty_months: 12,
    });
    expect(settings.installation_items).toEqual([
      { kind: "BASE_SYSTEM", amount: 0, included: false },
      { kind: "HP_ROOF_BAR", amount: 0, included: false },
    ]);
  });

  test("maps null supply-condition text columns to empty strings", () => {
    const settings = parseOfferSettings({
      show_net_total_only: false,
      transport_amount: "0.00",
      transport_mode: "TBD",
      installation_mode: "TBD",
      installation_items: [],
      extra_discount_amount: "0.00",
      delivery_date: null,
      delivery_destination: null,
      payment_terms: null,
      warranty_months: 12,
    });
    expect(settings.delivery_date).toBeNull();
    expect(settings.delivery_destination).toBe("");
    expect(settings.payment_terms).toBe("");
    expect(settings.warranty_months).toBe(12);
  });

  test("normalizes an out-of-catalog stored warranty to 12 months", () => {
    const settings = parseOfferSettings({
      show_net_total_only: false,
      transport_amount: "0.00",
      transport_mode: "TBD",
      installation_mode: "TBD",
      installation_items: [],
      extra_discount_amount: "0.00",
      delivery_date: null,
      delivery_destination: null,
      payment_terms: null,
      warranty_months: 36,
    });
    expect(settings.warranty_months).toBe(12);
  });

  test("recovers from malformed stored items", () => {
    const settings = parseOfferSettings({
      show_net_total_only: false,
      transport_amount: "0.00",
      transport_mode: "TBD",
      installation_mode: "TBD",
      installation_items: { not: "an array" },
      extra_discount_amount: "0.00",
      delivery_date: null,
      delivery_destination: null,
      payment_terms: null,
      warranty_months: 12,
    });
    expect(settings.installation_items).toHaveLength(2);
  });
});

// ── computeOfferSummaryExtras ────────────────────────────────────────────────

describe("computeOfferSummaryExtras — transport", () => {
  test("INCLUDED adds the amount to the net total without showing it", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({ transport_mode: "INCLUDED", transport_amount: 300 }),
      1000,
    );
    expect(extras.transportRow).toEqual({
      label: "Trasporto compreso",
      amount: null,
    });
    expect(extras.net_total).toBe(1300);
    expect(extras.hasNetAdjustments).toBe(true);
  });

  test("SEPARATE shows the amount without adding it", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({ transport_mode: "SEPARATE", transport_amount: 300 }),
      1000,
    );
    expect(extras.transportRow).toEqual({
      label: "Trasporto a parte",
      amount: 300,
    });
    expect(extras.net_total).toBe(1000);
    expect(extras.hasNetAdjustments).toBe(false);
  });

  test("TBD overrides the entered amount", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({ transport_mode: "TBD", transport_amount: 300 }),
      1000,
    );
    expect(extras.transportRow).toEqual({
      label: "Trasporto: da definire",
      amount: null,
    });
    expect(extras.net_total).toBe(1000);
    expect(extras.hasNetAdjustments).toBe(false);
  });

  test("CUSTOMER renders a label-only row and ignores the amount", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({ transport_mode: "CUSTOMER", transport_amount: 300 }),
      1000,
    );
    expect(extras.transportRow).toEqual({
      label: "Trasporto a cura cliente",
      amount: null,
    });
    expect(extras.net_total).toBe(1000);
    expect(extras.hasNetAdjustments).toBe(false);
  });
});

describe("computeOfferSummaryExtras — installation", () => {
  const items = [
    { kind: "BASE_SYSTEM" as const, amount: 1000, included: true },
    { kind: "HP_ROOF_BAR" as const, amount: 500, included: false },
  ];

  test("INCLUDED adds the included items total without showing it", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({
        installation_mode: "INCLUDED",
        installation_items: items,
      }),
      1000,
    );
    expect(extras.installationRow).toEqual({
      label: "Installazione compresa",
      amount: null,
    });
    expect(extras.net_total).toBe(2000);
    expect(extras.hasNetAdjustments).toBe(true);
  });

  test("SEPARATE shows the included items total without adding it", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({
        installation_mode: "SEPARATE",
        installation_items: items,
      }),
      1000,
    );
    expect(extras.installationRow).toEqual({
      label: "Installazione a parte",
      amount: 1000,
    });
    expect(extras.net_total).toBe(1000);
    expect(extras.hasNetAdjustments).toBe(false);
  });

  test("TBD excludes installation regardless of item flags", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({ installation_mode: "TBD", installation_items: items }),
      1000,
    );
    expect(extras.installationRow).toEqual({
      label: "Installazione: da definire",
      amount: null,
    });
    expect(extras.net_total).toBe(1000);
    expect(extras.hasNetAdjustments).toBe(false);
  });

  test("combines transport and installation in the net total", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({
        transport_mode: "INCLUDED",
        transport_amount: 250,
        installation_mode: "INCLUDED",
        installation_items: items,
      }),
      1000,
    );
    expect(extras.net_total).toBe(2250);
    expect(extras.hasNetAdjustments).toBe(true);
  });
});

describe("computeOfferSummaryExtras — extra discount", () => {
  test("subtracts the amount and exposes a negative-amount row", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({ extra_discount_amount: 800 }),
      75800,
    );
    expect(extras.extraDiscountRow).toEqual({
      label: "Sconto extra",
      amount: -800,
    });
    expect(extras.net_total).toBe(75000);
    expect(extras.hasNetAdjustments).toBe(true);
  });

  test("zero discount yields no row and an unchanged total", () => {
    const extras = computeOfferSummaryExtras(makeSettings(), 75800);
    expect(extras.extraDiscountRow).toBeNull();
    expect(extras.net_total).toBe(75800);
    expect(extras.hasNetAdjustments).toBe(false);
  });

  test("combines with included transport and installation", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({
        transport_mode: "INCLUDED",
        transport_amount: 250,
        installation_mode: "INCLUDED",
        installation_items: [
          { kind: "BASE_SYSTEM", amount: 1000, included: true },
        ],
        extra_discount_amount: 800,
      }),
      1000,
    );
    expect(extras.net_total).toBe(1450);
    expect(extras.hasNetAdjustments).toBe(true);
  });

  test("net-total-only suppresses the row but keeps the subtraction", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({ show_net_total_only: true, extra_discount_amount: 800 }),
      75800,
    );
    expect(extras.extraDiscountRow).toBeNull();
    expect(extras.net_total).toBe(75000);
  });

  test("a discount above the subtotal is not clamped", () => {
    const extras = computeOfferSummaryExtras(
      makeSettings({ extra_discount_amount: 1500 }),
      1000,
    );
    expect(extras.net_total).toBe(-500);
  });

  test("a discount exactly cancelling an included add-on still reveals the net total", () => {
    // hasNetAdjustments is presence-based, not a totals comparison: the
    // discount row renders, so the net total must stay visible even when the
    // included add-on and the discount cancel out numerically — otherwise the
    // document would end on a dangling "-800" with no final result.
    const extras = computeOfferSummaryExtras(
      makeSettings({
        transport_mode: "INCLUDED",
        transport_amount: 800,
        extra_discount_amount: 800,
      }),
      1000,
    );
    expect(extras.extraDiscountRow).not.toBeNull();
    expect(extras.net_total).toBe(1000);
    expect(extras.hasNetAdjustments).toBe(true);
  });
});
