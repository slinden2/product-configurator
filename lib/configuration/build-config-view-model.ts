import type { ConfigSchema } from "@/validation/config-schema";
import {
  getSupplyFixingOptions,
  selectFieldOptions,
} from "@/validation/configuration";
import type { WashBaySchema } from "@/validation/wash-bay-schema";
import type { WaterTankSchema } from "@/validation/water-tank-schema";
import {
  getWashHeightMm,
  hasBrushes,
  isAnchoredRail,
  isInverterPump1Selected,
  isOmzMachine,
  showAcidPumpDetails,
  showCardQty,
  showChassisWashSensor,
  showChemicalPumpDetails,
  showChemicalRoofBar,
  showManualAntifreeze,
  showPostFrame,
  showTankBlowerAndFloat,
  showWashBayEnergyChainFields,
} from "./display-rules";
import {
  CONFIG_FIELD_LABELS,
  DERIVED_FIELD_LABELS,
  WASH_BAY_FIELD_LABELS,
  WATER_TANK_FIELD_LABELS,
} from "./field-labels";
import {
  EMPTY_DISPLAY,
  formatBoolean,
  formatEnumValue,
  formatNumber,
  formatText,
} from "./format-field-value";

/**
 * Framework-agnostic read-only view model for a configuration and its
 * sub-records. Both the HTML view page and the @react-pdf export render from
 * this structure, so row selection and value formatting live in one place and
 * cannot diverge between screen and PDF. Conditional rows mirror the editable
 * form via the shared predicates in `display-rules`.
 */

export interface ViewRow {
  /** Schema field name (or derived-field key) — stable join key for diffing. */
  key: string;
  label: string;
  value: string;
}

export interface ViewGroup {
  /** Optional subsection heading within a section. */
  title?: string;
  rows: ViewRow[];
}

export interface ViewSection {
  title: string;
  groups: ViewGroup[];
}

/**
 * A run of view sections optionally introduced by a heading (e.g. the water
 * tanks under "Serbatoi"). Lets the HTML view and the PDF iterate the exact
 * same top-level structure — including the group headings — from one source.
 */
export interface ViewSectionGroup {
  /** Heading shown above the sections, or null for the top-level config spec. */
  title: string | null;
  sections: ViewSection[];
}

const o = selectFieldOptions;

/** Row factory bound to a label map: resolves the label from the field key. */
const rowFor =
  <M extends Record<string, string>>(labels: M) =>
  (key: keyof M & string, value: string): ViewRow => ({
    key,
    label: labels[key],
    value,
  });

const configRow = rowFor(CONFIG_FIELD_LABELS);
const tankRow = rowFor(WATER_TANK_FIELD_LABELS);
const bayRow = rowFor(WASH_BAY_FIELD_LABELS);
const derivedRow = rowFor(DERIVED_FIELD_LABELS);

export function buildConfigViewModel(c: ConfigSchema): ViewSection[] {
  const washHeightMm = getWashHeightMm(c.total_height);

  const generalRows: ViewRow[] = [
    configRow("name", formatText(c.name)),
    configRow("description", formatText(c.description)),
    configRow(
      "machine_type",
      formatEnumValue(c.machine_type, o.machineTypeOpts),
    ),
  ];
  if (isOmzMachine(c)) {
    generalRows.push(
      configRow("has_omz_paint", formatBoolean(c.has_omz_paint)),
    );
  }
  generalRows.push(
    configRow("total_height", formatNumber(c.total_height, "mm")),
    derivedRow(
      "wash_height",
      washHeightMm !== null ? `${washHeightMm} mm` : EMPTY_DISPLAY,
    ),
  );

  const brushRows: ViewRow[] = [
    configRow("brush_qty", formatEnumValue(c.brush_qty, o.brushNums)),
  ];
  if (hasBrushes(c)) {
    brushRows.push(
      configRow("brush_type", formatEnumValue(c.brush_type, o.brushTypes)),
      configRow("brush_color", formatEnumValue(c.brush_color, o.brushColors)),
    );
  }

  const chemRows: ViewRow[] = [
    configRow("has_shampoo_pump", formatBoolean(c.has_shampoo_pump)),
    configRow("has_wax_pump", formatBoolean(c.has_wax_pump)),
    configRow("has_chemical_pump", formatBoolean(c.has_chemical_pump)),
    configRow("has_acid_pump", formatBoolean(c.has_acid_pump)),
  ];
  if (showChemicalPumpDetails(c)) {
    chemRows.push(
      configRow("chemical_qty", formatEnumValue(c.chemical_qty, o.chemicalNum)),
      configRow(
        "chemical_pump_pos",
        formatEnumValue(c.chemical_pump_pos, o.chemicalPumpPositions),
      ),
      configRow("has_foam", formatBoolean(c.has_foam)),
    );
  }
  if (showAcidPumpDetails(c)) {
    chemRows.push(
      configRow(
        "acid_pump_pos",
        formatEnumValue(c.acid_pump_pos, o.chemicalPumpPositions),
      ),
    );
  }

  const waterRows: ViewRow[] = [
    configRow("water_1_type", formatEnumValue(c.water_1_type, o.waterTypes)),
    configRow(
      "water_1_pump",
      formatEnumValue(c.water_1_pump, o.waterPump1Opts),
    ),
  ];
  if (isInverterPump1Selected(c)) {
    waterRows.push(
      configRow(
        "inv_pump_outlet_dosatron_qty",
        formatNumber(c.inv_pump_outlet_dosatron_qty),
      ),
      configRow(
        "inv_pump_outlet_pw_qty",
        formatNumber(c.inv_pump_outlet_pw_qty),
      ),
      configRow("has_filter_backwash", formatBoolean(c.has_filter_backwash)),
    );
  }
  waterRows.push(
    configRow("water_2_type", formatEnumValue(c.water_2_type, o.waterTypes)),
    configRow(
      "water_2_pump",
      formatEnumValue(c.water_2_pump, o.waterPump2Opts),
    ),
    configRow("has_antifreeze", formatBoolean(c.has_antifreeze)),
  );

  const supplyFixingOptions = getSupplyFixingOptions(c.supply_type);
  const supplyRows: ViewRow[] = [
    configRow("supply_type", formatEnumValue(c.supply_type, o.supplyTypes)),
    configRow(
      "supply_fixing_type",
      formatEnumValue(c.supply_fixing_type, supplyFixingOptions),
    ),
  ];
  if (showPostFrame(c)) {
    supplyRows.push(
      configRow("has_post_frame", formatBoolean(c.has_post_frame)),
    );
  }
  supplyRows.push(
    configRow("supply_side", formatEnumValue(c.supply_side, o.supplySides)),
  );

  const railRows: ViewRow[] = [
    configRow("rail_type", formatEnumValue(c.rail_type, o.railTypes)),
  ];
  if (isAnchoredRail(c)) {
    railRows.push(
      configRow("anchor_type", formatEnumValue(c.anchor_type, o.anchorTypes)),
    );
  }
  railRows.push(
    configRow("rail_length", formatEnumValue(c.rail_length, o.railLengths)),
    configRow(
      "rail_guide_qty",
      formatEnumValue(c.rail_guide_qty, o.railGuideNum),
    ),
  );

  const touchRows: ViewRow[] = [
    configRow("touch_qty", formatEnumValue(c.touch_qty, o.touchQtyOpts)),
    configRow("touch_pos", formatEnumValue(c.touch_pos, o.touchPositionOpts)),
    configRow(
      "touch_fixing_type",
      formatEnumValue(c.touch_fixing_type, o.touchFixingTypeOpts),
    ),
    configRow("has_itecoweb", formatBoolean(c.has_itecoweb)),
    configRow("has_card_reader", formatBoolean(c.has_card_reader)),
    configRow("is_fast", formatBoolean(c.is_fast)),
    configRow(
      "emergency_stop_qty",
      formatEnumValue(c.emergency_stop_qty, o.emergencyStopQtyOpts),
    ),
  ];
  if (showCardQty(c)) {
    touchRows.push(
      configRow("card_qty", formatEnumValue(c.card_qty, o.cardQtyOpts)),
    );
  }

  const hpRows: ViewRow[] = [
    configRow("has_75kw_pump", formatBoolean(c.has_75kw_pump)),
  ];
  if (c.has_75kw_pump) {
    hpRows.push(
      configRow(
        "pump_outlet_1_75kw",
        formatEnumValue(c.pump_outlet_1_75kw, o.hpPumpOutlet75kwTypes),
      ),
      configRow(
        "pump_outlet_2_75kw",
        formatEnumValue(c.pump_outlet_2_75kw, o.hpPumpOutlet75kwTypes),
      ),
    );
  }
  hpRows.push(configRow("has_15kw_pump", formatBoolean(c.has_15kw_pump)));
  if (c.has_15kw_pump) {
    hpRows.push(
      configRow(
        "has_15kw_pump_softstart",
        formatBoolean(c.has_15kw_pump_softstart),
      ),
      configRow(
        "pump_outlet_1_15kw",
        formatEnumValue(c.pump_outlet_1_15kw, o.hpPumpOutlet15kwTypes),
      ),
      configRow(
        "pump_outlet_2_15kw",
        formatEnumValue(c.pump_outlet_2_15kw, o.hpPumpOutlet15kwTypes),
      ),
    );
  }
  hpRows.push(configRow("has_30kw_pump", formatBoolean(c.has_30kw_pump)));
  if (c.has_30kw_pump) {
    hpRows.push(
      configRow(
        "pump_outlet_1_30kw",
        formatEnumValue(c.pump_outlet_1_30kw, o.hpPumpOutlet30kwTypes),
      ),
      configRow(
        "pump_outlet_2_30kw",
        formatEnumValue(c.pump_outlet_2_30kw, o.hpPumpOutlet30kwTypes),
      ),
    );
  }
  hpRows.push(configRow("has_omz_pump", formatBoolean(c.has_omz_pump)));
  if (c.has_omz_pump) {
    hpRows.push(
      configRow(
        "pump_outlet_omz",
        formatEnumValue(c.pump_outlet_omz, o.omzPumpOutletTypes),
      ),
    );
    if (showChemicalRoofBar(c)) {
      hpRows.push(
        configRow(
          "has_chemical_roof_bar",
          formatBoolean(c.has_chemical_roof_bar),
        ),
      );
    }
  }
  if (showChassisWashSensor(c)) {
    hpRows.push(
      configRow(
        "chassis_wash_sensor_type",
        formatEnumValue(
          c.chassis_wash_sensor_type,
          o.chassisWashSensorTypeOpts,
        ),
      ),
      configRow(
        "has_chassis_wash_plates",
        formatBoolean(c.has_chassis_wash_plates),
      ),
    );
  }

  const miscRows: ViewRow[] = [
    configRow(
      "has_chassis_wash_detergent_pump",
      formatBoolean(c.has_chassis_wash_detergent_pump),
    ),
  ];
  if (showManualAntifreeze(c)) {
    miscRows.push(
      configRow(
        "has_chassis_wash_detergent_manual_antifreeze",
        formatBoolean(c.has_chassis_wash_detergent_manual_antifreeze),
      ),
    );
  }

  const notesRows: ViewRow[] = [
    configRow("sales_notes", formatText(c.sales_notes)),
    configRow("engineering_notes", formatText(c.engineering_notes)),
  ];

  return [
    { title: "Informazioni generali", groups: [{ rows: generalRows }] },
    { title: "Spazzole", groups: [{ rows: brushRows }] },
    { title: "Pompe dosatrici", groups: [{ rows: chemRows }] },
    { title: "Alimentazione acqua", groups: [{ rows: waterRows }] },
    { title: "Alimentazione portale", groups: [{ rows: supplyRows }] },
    { title: "Rotaie", groups: [{ rows: railRows }] },
    { title: "Quadro elettrico", groups: [{ rows: touchRows }] },
    { title: "Pompe HP", groups: [{ rows: hpRows }] },
    { title: "Varie", groups: [{ rows: miscRows }] },
    { title: "Note", groups: [{ rows: notesRows }] },
  ];
}

export function buildWaterTankViewSection(
  tank: WaterTankSchema,
  index: number,
): ViewSection {
  const rows: ViewRow[] = [
    tankRow("type", formatEnumValue(tank.type, o.waterTankOpts)),
    tankRow("inlet_w_float_qty", formatNumber(tank.inlet_w_float_qty)),
    tankRow("inlet_no_float_qty", formatNumber(tank.inlet_no_float_qty)),
    tankRow("outlet_w_valve_qty", formatNumber(tank.outlet_w_valve_qty)),
    tankRow("outlet_no_valve_qty", formatNumber(tank.outlet_no_valve_qty)),
  ];
  if (showTankBlowerAndFloat(tank)) {
    rows.push(
      tankRow("has_blower", formatBoolean(tank.has_blower)),
      tankRow(
        "has_electric_float_for_purifier",
        formatBoolean(tank.has_electric_float_for_purifier),
      ),
    );
  }
  return { title: `Serbatoio ${index}`, groups: [{ rows }] };
}

export function buildWashBayViewSection(
  bay: WashBaySchema,
  index: number,
  supplyType: ConfigSchema["supply_type"],
): ViewSection {
  const mainRows: ViewRow[] = [
    bayRow("hp_lance_qty", formatNumber(bay.hp_lance_qty)),
    bayRow("det_lance_qty", formatNumber(bay.det_lance_qty)),
    bayRow(
      "pressure_washer_type",
      formatEnumValue(bay.pressure_washer_type, o.pressureWasherOpts),
    ),
    bayRow("pressure_washer_qty", formatNumber(bay.pressure_washer_qty)),
    bayRow("has_gantry", formatBoolean(bay.has_gantry)),
    bayRow("is_first_bay", formatBoolean(bay.is_first_bay)),
    bayRow("has_bay_dividers", formatBoolean(bay.has_bay_dividers)),
    bayRow("has_weeping_lances", formatBoolean(bay.has_weeping_lances)),
  ];

  const hoseReelRows: ViewRow[] = [
    bayRow(
      "hose_reel_hp_with_post_qty",
      formatNumber(bay.hose_reel_hp_with_post_qty),
    ),
    bayRow(
      "hose_reel_hp_without_post_qty",
      formatNumber(bay.hose_reel_hp_without_post_qty),
    ),
    bayRow(
      "hose_reel_det_with_post_qty",
      formatNumber(bay.hose_reel_det_with_post_qty),
    ),
    bayRow(
      "hose_reel_det_without_post_qty",
      formatNumber(bay.hose_reel_det_without_post_qty),
    ),
    bayRow(
      "hose_reel_hp_det_with_post_qty",
      formatNumber(bay.hose_reel_hp_det_with_post_qty),
    ),
  ];

  const groups: ViewGroup[] = [
    { rows: mainRows },
    { title: "Avvolgitori", rows: hoseReelRows },
  ];

  if (showWashBayEnergyChainFields(bay, supplyType)) {
    groups.push({
      title: "Catenaria",
      rows: [
        bayRow(
          "energy_chain_width",
          formatEnumValue(bay.energy_chain_width, o.cableChainWidths),
        ),
        bayRow("has_shelf_extension", formatBoolean(bay.has_shelf_extension)),
        bayRow("ec_signal_cable_qty", formatNumber(bay.ec_signal_cable_qty)),
        bayRow(
          "ec_profinet_cable_qty",
          formatNumber(bay.ec_profinet_cable_qty),
        ),
        bayRow("ec_water_1_tube_qty", formatNumber(bay.ec_water_1_tube_qty)),
        bayRow("ec_water_34_tube_qty", formatNumber(bay.ec_water_34_tube_qty)),
        bayRow("ec_r1_1_tube_qty", formatNumber(bay.ec_r1_1_tube_qty)),
        bayRow("ec_r2_1_tube_qty", formatNumber(bay.ec_r2_1_tube_qty)),
        bayRow(
          "ec_r2_34_inox_tube_qty",
          formatNumber(bay.ec_r2_34_inox_tube_qty),
        ),
        bayRow("ec_air_tube_qty", formatNumber(bay.ec_air_tube_qty)),
      ],
    });
  }

  return { title: `Pista ${index}`, groups };
}

/**
 * Complete top-level structure for a configuration's read-only surfaces: the
 * spec sections followed by the (optional) "Serbatoi" and "Piste" groups.
 * The HTML view and the PDF both render from this so their section ordering and
 * group headings stay identical. Empty sub-record groups are omitted.
 */
export function buildCompleteConfigViewSections(
  configuration: ConfigSchema,
  waterTanks: WaterTankSchema[],
  washBays: WashBaySchema[],
): ViewSectionGroup[] {
  const tankSections = waterTanks.map((tank, i) =>
    buildWaterTankViewSection(tank, i + 1),
  );
  const baySections = washBays.map((bay, i) =>
    buildWashBayViewSection(bay, i + 1, configuration.supply_type),
  );

  const groups: ViewSectionGroup[] = [
    { title: null, sections: buildConfigViewModel(configuration) },
    { title: "Serbatoi", sections: tankSections },
    { title: "Piste", sections: baySections },
  ];

  return groups.filter((group) => group.sections.length > 0);
}
