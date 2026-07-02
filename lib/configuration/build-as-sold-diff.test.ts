import { describe, expect, it } from "vitest";
import { makeValidConfig } from "@/test/form-test-utils";
import type { OfferConfigSnapshot } from "@/validation/offer-config-snapshot-schema";
import {
  type UpdateWashBaySchema,
  washBayDefaults,
} from "@/validation/wash-bay-schema";
import {
  type UpdateWaterTankSchema,
  waterTankDefaults,
} from "@/validation/water-tank-schema";
import {
  type AsSoldDiff,
  buildAsSoldDiff,
  parseAsSoldSnapshot,
} from "./build-as-sold-diff";
import { CONFIG_FIELD_LABELS } from "./field-labels";

const makeTank = (
  id: number,
  overrides: Partial<UpdateWaterTankSchema> = {},
): UpdateWaterTankSchema => ({
  ...waterTankDefaults,
  id,
  configuration_id: 1,
  ...overrides,
});

const makeBay = (
  id: number,
  overrides: Partial<UpdateWashBaySchema> = {},
): UpdateWashBaySchema => ({
  ...washBayDefaults,
  id,
  configuration_id: 1,
  ...overrides,
});

const makeSnapshot = (
  overrides: Partial<OfferConfigSnapshot> = {},
): OfferConfigSnapshot => ({
  configuration: makeValidConfig(),
  waterTanks: [],
  washBays: [],
  ...overrides,
});

const allRows = (diff: AsSoldDiff) =>
  diff.sections.flatMap((section) => section.rows);

describe("buildAsSoldDiff", () => {
  it("reports no changes for identical sides", () => {
    const diff = buildAsSoldDiff(
      makeSnapshot({ waterTanks: [makeTank(1)], washBays: [makeBay(1)] }),
      makeSnapshot({ waterTanks: [makeTank(1)], washBays: [makeBay(1)] }),
    );
    expect(diff.hasChanges).toBe(false);
    expect(diff.sections).toEqual([]);
  });

  it("treats undefined and empty string as the same empty display", () => {
    const diff = buildAsSoldDiff(
      makeSnapshot({
        configuration: makeValidConfig({ description: undefined }),
      }),
      makeSnapshot({ configuration: makeValidConfig({ description: "" }) }),
    );
    expect(diff.hasChanges).toBe(false);
  });

  it("reports a changed field with both formatted values", () => {
    const diff = buildAsSoldDiff(
      makeSnapshot({
        configuration: makeValidConfig({ brush_qty: 2, brush_type: "THREAD" }),
      }),
      makeSnapshot({
        configuration: makeValidConfig({ brush_qty: 3, brush_type: "THREAD" }),
      }),
    );
    expect(diff.hasChanges).toBe(true);
    expect(diff.sections).toHaveLength(1);
    expect(diff.sections[0].title).toBe("Spazzole");
    const row = diff.sections[0].rows.find((r) => r.key === "brush_qty");
    expect(row).toMatchObject({
      label: CONFIG_FIELD_LABELS.brush_qty,
      status: "changed",
    });
    expect(row?.asSoldValue).not.toBeNull();
    expect(row?.currentValue).not.toBeNull();
    expect(row?.asSoldValue).not.toBe(row?.currentValue);
  });

  it("joins duplicate-labelled fields by key, not label", () => {
    // pump_outlet_1_75kw/15kw/30kw all share the label "Uscita 1".
    const base = {
      has_15kw_pump: true,
      pump_outlet_2_15kw: "LOW_BARS",
      has_75kw_pump: true,
      pump_outlet_1_75kw: "CHASSIS_WASH",
      pump_outlet_2_75kw: "CHASSIS_WASH",
    } as const;
    const diff = buildAsSoldDiff(
      makeSnapshot({
        configuration: makeValidConfig({
          ...base,
          pump_outlet_1_15kw: "LOW_SPINNERS",
        }),
      }),
      makeSnapshot({
        configuration: makeValidConfig({
          ...base,
          pump_outlet_1_15kw: "HIGH_BARS",
        }),
      }),
    );
    const rows = allRows(diff);
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("pump_outlet_1_15kw");
    expect(rows[0].status).toBe("changed");
  });

  it("surfaces a conditional-visibility flip as added rows", () => {
    const diff = buildAsSoldDiff(
      makeSnapshot({ configuration: makeValidConfig({ brush_qty: 0 }) }),
      makeSnapshot({
        configuration: makeValidConfig({
          brush_qty: 3,
          brush_type: "THREAD",
          brush_color: "GREEN_SILVER",
        }),
      }),
    );
    const brushType = allRows(diff).find((r) => r.key === "brush_type");
    expect(brushType).toMatchObject({ status: "added", asSoldValue: null });
    expect(brushType?.currentValue).not.toBeNull();
  });

  it("pairs tanks by id so a mid-list removal does not mispair the rest", () => {
    const asSold = makeSnapshot({
      waterTanks: [
        makeTank(1),
        makeTank(2, { type: "L2000" }),
        makeTank(3, { inlet_w_float_qty: 2 }),
      ],
    });
    const current = makeSnapshot({
      waterTanks: [makeTank(1), makeTank(3, { inlet_w_float_qty: 2 })],
    });
    const diff = buildAsSoldDiff(asSold, current);
    expect(diff.sections).toHaveLength(1);
    expect(diff.sections[0].title).toBe("Serbatoio 2 (rimosso)");
    expect(
      diff.sections[0].rows.every(
        (r) => r.status === "removed" && r.currentValue === null,
      ),
    ).toBe(true);
  });

  it("reports an added bay with all rows added", () => {
    const diff = buildAsSoldDiff(
      makeSnapshot(),
      makeSnapshot({ washBays: [makeBay(1)] }),
    );
    expect(diff.sections).toHaveLength(1);
    expect(diff.sections[0].title).toBe("Pista 1 (aggiunta)");
    expect(
      diff.sections[0].rows.every(
        (r) => r.status === "added" && r.asSoldValue === null,
      ),
    ).toBe(true);
  });

  it("uses each side's own supply_type for the energy-chain group", () => {
    const bay = makeBay(1, { has_gantry: true });
    const diff = buildAsSoldDiff(
      makeSnapshot({
        configuration: makeValidConfig({ supply_type: "STRAIGHT_SHELF" }),
        washBays: [bay],
      }),
      makeSnapshot({
        configuration: makeValidConfig({ supply_type: "ENERGY_CHAIN" }),
        washBays: [bay],
      }),
    );
    const bayRows = diff.sections.find((s) => s.title === "Pista 1")?.rows;
    const ecRow = bayRows?.find((r) => r.key === "energy_chain_width");
    expect(ecRow).toMatchObject({ status: "added", asSoldValue: null });
  });

  it("falls back to index pairing when ids are missing", () => {
    const noIdTank = { ...waterTankDefaults } as UpdateWaterTankSchema;
    const diff = buildAsSoldDiff(
      makeSnapshot({ waterTanks: [noIdTank] }),
      makeSnapshot({
        waterTanks: [{ ...noIdTank, type: "L2000" }],
      }),
    );
    const rows = allRows(diff);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ key: "type", status: "changed" });
  });
});

describe("parseAsSoldSnapshot", () => {
  it("parses a valid snapshot", () => {
    const snapshot = makeSnapshot({ waterTanks: [makeTank(1)] });
    const parsed = parseAsSoldSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(parsed).not.toBeNull();
    expect(parsed?.configuration.name).toBe(snapshot.configuration.name);
    expect(parsed?.waterTanks).toHaveLength(1);
  });

  it("returns null for structurally unusable input", () => {
    expect(parseAsSoldSnapshot(null)).toBeNull();
    expect(parseAsSoldSnapshot("garbage")).toBeNull();
    expect(parseAsSoldSnapshot({})).toBeNull();
    expect(
      parseAsSoldSnapshot({
        configuration: {},
        waterTanks: "no",
        washBays: [],
      }),
    ).toBeNull();
  });

  it("falls back to the raw value for a stale snapshot instead of failing", () => {
    const stale = {
      configuration: { ...makeValidConfig(), machine_type: "LEGACY_TYPE" },
      waterTanks: [],
      washBays: [],
    };
    const parsed = parseAsSoldSnapshot(stale);
    expect(parsed).not.toBeNull();
    expect(parsed?.configuration.machine_type).toBe("LEGACY_TYPE");
  });
});
