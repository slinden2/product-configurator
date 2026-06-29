// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";

// --- Mocks ---

const mockGetPriceCoefficientsByArray = vi.fn();
const mockEnrichWithCosts = vi.fn();
const mockBomBuildCompleteBOM = vi.fn();
const mockBomInit = vi.fn();

vi.mock("@/db/queries", () => ({
  getPriceCoefficientsByArray: (...args: unknown[]) =>
    mockGetPriceCoefficientsByArray(...args),
  // Unused by computeLinePricing but imported by the module under test.
  getSurchargeSettings: vi.fn(),
  insertActivityLog: vi.fn(),
  loadConfigForPricing: vi.fn(),
  offerRevisionLineForConfig: vi.fn(),
  updateOfferRevisionLinePricing: vi.fn(),
  QueryError: class QueryError extends Error {},
}));

vi.mock("@/lib/BOM", () => ({
  enrichWithCosts: (...args: unknown[]) => mockEnrichWithCosts(...args),
  BOM: {
    init: (...args: unknown[]) => mockBomInit(...args),
  },
}));

import {
  type DatabaseType,
  getSurchargeSettings,
  insertActivityLog,
  loadConfigForPricing,
  offerRevisionLineForConfig,
  updateOfferRevisionLinePricing,
} from "@/db/queries";
import type { ConfigurationWithWaterTanksAndWashBays } from "@/db/schemas";
import { MSG } from "@/lib/messages";
import {
  computeLinePricing,
  repriceOfferLine,
  repriceOfferLines,
} from "@/lib/offer-revision-pricing";
import { round2 } from "@/lib/utils";
import { STANDARD_MACHINE_HEIGHT_MM } from "@/types";

// --- Helpers ---

function configWith(
  overrides: Partial<ConfigurationWithWaterTanksAndWashBays>,
): ConfigurationWithWaterTanksAndWashBays {
  return {
    total_height: STANDARD_MACHINE_HEIGHT_MM,
    has_omz_paint: false,
    ...overrides,
  } as ConfigurationWithWaterTanksAndWashBays;
}

/** One general BOM item: cost 100 × coeff 3 × qty 2 = 600 line total. */
function mockSingleGeneralItem() {
  mockBomInit.mockReturnValue({ buildCompleteBOM: mockBomBuildCompleteBOM });
  mockBomBuildCompleteBOM.mockResolvedValue({
    generalBOM: [{ pn: "GEN-01", description: "Frame", qty: 2, tag: "FRAME" }],
    waterTankBOMs: [],
    washBayBOMs: [],
  });
  mockGetPriceCoefficientsByArray.mockResolvedValue([
    { pn: "GEN-01", coefficient: "3.00" },
  ]);
  mockEnrichWithCosts.mockResolvedValue([
    { pn: "GEN-01", description: "Frame", qty: 2, tag: "FRAME", cost: 100 },
  ]);
}

const HEIGHT_SETTING = { kind: "HEIGHT", price: "500" };
const PAINT_SETTING = { kind: "PAINT", price: "300" };

// --- Tests ---

describe("round2", () => {
  test("rounds to two decimals", () => {
    expect(round2(994.99005)).toBe(994.99);
    expect(round2(600)).toBe(600);
  });
});

describe("computeLinePricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingleGeneralItem();
  });

  test("list price is the BOM total when no surcharge applies", async () => {
    const result = await computeLinePricing(configWith({}), 0, [
      HEIGHT_SETTING,
      PAINT_SETTING,
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pricing.list_price).toBe(600);
    expect(result.pricing.net_price).toBe(600);
    expect(result.pricing.pricing_snapshot).toHaveLength(1);
  });

  test("net price applies the header discount per unit, rounded", async () => {
    const result = await computeLinePricing(configWith({}), 12.5, [
      HEIGHT_SETTING,
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pricing.list_price).toBe(600);
    expect(result.pricing.net_price).toBe(525); // 600 * 0.875
  });

  test("adds a height surcharge to the list price and snapshot", async () => {
    const result = await computeLinePricing(
      configWith({ total_height: STANDARD_MACHINE_HEIGHT_MM + 500 }),
      0,
      [HEIGHT_SETTING, PAINT_SETTING],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pricing.list_price).toBe(1100); // 600 + 500
    expect(result.pricing.pricing_snapshot).toHaveLength(2);
  });

  test("adds a paint surcharge to the list price", async () => {
    const result = await computeLinePricing(
      configWith({ has_omz_paint: true }),
      0,
      [HEIGHT_SETTING, PAINT_SETTING],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pricing.list_price).toBe(900); // 600 + 300
  });

  test("fails when a triggered surcharge has no configured price", async () => {
    const result = await computeLinePricing(
      configWith({ has_omz_paint: true }),
      0,
      [HEIGHT_SETTING, { kind: "PAINT", price: "0" }],
    );
    expect(result.ok).toBe(false);
  });

  test("returns a zero list price for an empty BOM", async () => {
    mockBomInit.mockReturnValue({ buildCompleteBOM: mockBomBuildCompleteBOM });
    mockBomBuildCompleteBOM.mockResolvedValue({
      generalBOM: [],
      waterTankBOMs: [],
      washBayBOMs: [],
    });
    const result = await computeLinePricing(configWith({}), 10, []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pricing.list_price).toBe(0);
    expect(result.pricing.net_price).toBe(0);
    expect(result.pricing.pricing_snapshot).toHaveLength(0);
  });
});

describe("repriceOfferLine", () => {
  const CONFIG_ID = 42;
  // The queries are mocked, so the tx value is only an identity token for the
  // "uses the caller's tx" assertions.
  const TX = {} as DatabaseType;

  // getSurchargeSettings returns richer DB rows; computeLinePricing only reads
  // { kind, price }, so cast the lean test settings to the mock's row type.
  const settings = (rows: { kind: string; price: string }[]) =>
    rows as unknown as Awaited<ReturnType<typeof getSurchargeSettings>>;

  type Line = NonNullable<
    Awaited<ReturnType<typeof offerRevisionLineForConfig>>
  >;
  function draftLine(overrides: Partial<Line> = {}): Line {
    return {
      lineId: 7,
      revisionId: 3,
      discount_pct: "10.00",
      status: "DRAFT",
      ...overrides,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockSingleGeneralItem(); // BOM = 600 list
    vi.mocked(offerRevisionLineForConfig).mockResolvedValue(draftLine());
    vi.mocked(loadConfigForPricing).mockResolvedValue(configWith({}));
    vi.mocked(getSurchargeSettings).mockResolvedValue(
      settings([HEIGHT_SETTING, PAINT_SETTING]),
    );
    vi.mocked(updateOfferRevisionLinePricing).mockResolvedValue(undefined);
    vi.mocked(insertActivityLog).mockResolvedValue(undefined);
  });

  test("persists the recomputed pricing and audits, using the caller's tx", async () => {
    await repriceOfferLine(CONFIG_ID, "u1", TX);

    expect(updateOfferRevisionLinePricing).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ list_price: 600, net_price: 540 }),
      TX,
    );
    expect(insertActivityLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "OFFER_LINE_REPRICE" }),
      TX,
    );
  });

  test("skips the audit when opts.audit is false (first pricing)", async () => {
    await repriceOfferLine(CONFIG_ID, "u1", TX, { audit: false });

    expect(updateOfferRevisionLinePricing).toHaveBeenCalledOnce();
    expect(insertActivityLog).not.toHaveBeenCalled();
  });

  test("no-ops when the revision is not DRAFT (frozen as-sold line stays put)", async () => {
    vi.mocked(offerRevisionLineForConfig).mockResolvedValue(
      draftLine({ status: "SENT" }),
    );

    await repriceOfferLine(CONFIG_ID, "u1", TX);

    expect(updateOfferRevisionLinePricing).not.toHaveBeenCalled();
    expect(insertActivityLog).not.toHaveBeenCalled();
  });

  test("throws when an OFFER config has no owning line (data drift)", async () => {
    vi.mocked(offerRevisionLineForConfig).mockResolvedValue(null);

    await expect(repriceOfferLine(CONFIG_ID, "u1", TX)).rejects.toThrow(
      MSG.offer.notFound,
    );
    expect(updateOfferRevisionLinePricing).not.toHaveBeenCalled();
  });

  test("throws priceNotConfigured so the mutation rolls back when a triggered surcharge has no price", async () => {
    // Paint is triggered but its configured price is 0 → computeLinePricing fails.
    vi.mocked(loadConfigForPricing).mockResolvedValue(
      configWith({ has_omz_paint: true }),
    );
    vi.mocked(getSurchargeSettings).mockResolvedValue(
      settings([HEIGHT_SETTING, { kind: "PAINT", price: "0" }]),
    );

    await expect(repriceOfferLine(CONFIG_ID, "u1", TX)).rejects.toThrow(
      MSG.surcharge.priceNotConfigured,
    );
    expect(updateOfferRevisionLinePricing).not.toHaveBeenCalled();
  });
});

describe("repriceOfferLines", () => {
  const TX = {} as DatabaseType;

  const settings = (rows: { kind: string; price: string }[]) =>
    rows as unknown as Awaited<ReturnType<typeof getSurchargeSettings>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSingleGeneralItem();
    vi.mocked(offerRevisionLineForConfig).mockResolvedValue({
      lineId: 7,
      revisionId: 3,
      discount_pct: "10.00",
      status: "DRAFT",
    });
    vi.mocked(loadConfigForPricing).mockResolvedValue(configWith({}));
    vi.mocked(getSurchargeSettings).mockResolvedValue(
      settings([HEIGHT_SETTING, PAINT_SETTING]),
    );
    vi.mocked(updateOfferRevisionLinePricing).mockResolvedValue(undefined);
    vi.mocked(insertActivityLog).mockResolvedValue(undefined);
  });

  test("fetches surcharge settings once for the whole pass, then prices each line", async () => {
    await repriceOfferLines([41, 42, 43], "u1", TX, { audit: false });

    expect(getSurchargeSettings).toHaveBeenCalledOnce();
    expect(updateOfferRevisionLinePricing).toHaveBeenCalledTimes(3);
  });

  test("no-ops (and skips the settings query) for an empty config list", async () => {
    await repriceOfferLines([], "u1", TX);

    expect(getSurchargeSettings).not.toHaveBeenCalled();
    expect(updateOfferRevisionLinePricing).not.toHaveBeenCalled();
  });
});
