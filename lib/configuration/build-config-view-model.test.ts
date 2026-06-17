import { describe, expect, it } from "vitest";
import { makeValidConfig } from "@/test/form-test-utils";
import {
  buildConfigViewModel,
  buildWashBayViewSection,
  buildWaterTankViewSection,
  type ViewSection,
} from "./build-config-view-model";
import { CONFIG_FIELD_LABELS } from "./field-labels";

const findSection = (sections: ViewSection[], title: string): ViewSection => {
  const section = sections.find((s) => s.title === title);
  if (!section) throw new Error(`Section not found: ${title}`);
  return section;
};

const allRows = (section: ViewSection) => section.groups.flatMap((g) => g.rows);
const hasLabel = (section: ViewSection, label: string) =>
  allRows(section).some((r) => r.label === label);
const valueOf = (section: ViewSection, label: string) =>
  allRows(section).find((r) => r.label === label)?.value;

describe("buildConfigViewModel", () => {
  it("emits all top-level sections", () => {
    const sections = buildConfigViewModel(makeValidConfig());
    expect(sections.map((s) => s.title)).toEqual([
      "Informazioni generali",
      "Spazzole",
      "Pompe dosatrici",
      "Alimentazione acqua",
      "Alimentazione portale",
      "Rotaie",
      "Quadro elettrico",
      "Pompe HP",
      "Varie",
      "Note",
    ]);
  });

  it("formats enum values to their Italian labels", () => {
    const sections = buildConfigViewModel(
      makeValidConfig({ machine_type: "OMZ" }),
    );
    const general = findSection(sections, "Informazioni generali");
    expect(valueOf(general, CONFIG_FIELD_LABELS.machine_type)).toBe("OMZ");
  });

  it("shows the OMZ paint row only for OMZ machines", () => {
    const omz = findSection(
      buildConfigViewModel(makeValidConfig({ machine_type: "OMZ" })),
      "Informazioni generali",
    );
    const std = findSection(
      buildConfigViewModel(makeValidConfig({ machine_type: "STD" })),
      "Informazioni generali",
    );
    expect(hasLabel(omz, CONFIG_FIELD_LABELS.has_omz_paint)).toBe(true);
    expect(hasLabel(std, CONFIG_FIELD_LABELS.has_omz_paint)).toBe(false);
  });

  it("hides brush type/color when there are no brushes", () => {
    const none = findSection(
      buildConfigViewModel(makeValidConfig({ brush_qty: 0 })),
      "Spazzole",
    );
    const withBrushes = findSection(
      buildConfigViewModel(
        makeValidConfig({ brush_qty: 3, brush_type: "THREAD" }),
      ),
      "Spazzole",
    );
    expect(hasLabel(none, CONFIG_FIELD_LABELS.brush_type)).toBe(false);
    expect(hasLabel(withBrushes, CONFIG_FIELD_LABELS.brush_type)).toBe(true);
  });

  it("renders booleans as Sì/No", () => {
    const misc = findSection(
      buildConfigViewModel(
        makeValidConfig({ has_chassis_wash_detergent_pump: true }),
      ),
      "Varie",
    );
    expect(
      valueOf(misc, CONFIG_FIELD_LABELS.has_chassis_wash_detergent_pump),
    ).toBe("Sì");
  });
});

describe("buildWaterTankViewSection", () => {
  it("titles the section by index and gates the blower rows", () => {
    const section = buildWaterTankViewSection(
      {
        type: "L2000",
        inlet_w_float_qty: 1,
        inlet_no_float_qty: 0,
        outlet_w_valve_qty: 1,
        outlet_no_valve_qty: 0,
        has_blower: false,
        has_electric_float_for_purifier: false,
      },
      1,
    );
    expect(section.title).toBe("Serbatoio 1");
    expect(hasLabel(section, "Con soffiante")).toBe(false);
  });
});

describe("buildWashBayViewSection", () => {
  it("adds the energy-chain group only for a gantry on an energy-chain supply", () => {
    const base = {
      hp_lance_qty: 0,
      det_lance_qty: 0,
      hose_reel_hp_with_post_qty: 0,
      hose_reel_hp_without_post_qty: 0,
      hose_reel_det_with_post_qty: 0,
      hose_reel_det_without_post_qty: 0,
      hose_reel_hp_det_with_post_qty: 0,
      pressure_washer_type: undefined,
      pressure_washer_qty: undefined,
      has_gantry: true,
      energy_chain_width: undefined,
      has_shelf_extension: false,
      ec_signal_cable_qty: undefined,
      ec_profinet_cable_qty: undefined,
      ec_water_1_tube_qty: undefined,
      ec_water_34_tube_qty: undefined,
      ec_r1_1_tube_qty: undefined,
      ec_r2_1_tube_qty: undefined,
      ec_r2_34_inox_tube_qty: undefined,
      ec_air_tube_qty: undefined,
      is_first_bay: false,
      has_bay_dividers: false,
      has_weeping_lances: false,
    };
    const withEc = buildWashBayViewSection(base, 1, "ENERGY_CHAIN");
    const withoutEc = buildWashBayViewSection(base, 1, "STRAIGHT_SHELF");
    expect(withEc.groups.some((g) => g.title === "Catenaria")).toBe(true);
    expect(withoutEc.groups.some((g) => g.title === "Catenaria")).toBe(false);
  });
});
