import type { ConfigSchema } from "@/validation/config-schema";
import { selectFieldOptions } from "@/validation/configuration";
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

const o = selectFieldOptions;
const row = (label: string, value: string): ViewRow => ({ label, value });

export function buildConfigViewModel(c: ConfigSchema): ViewSection[] {
  const washHeightMm = getWashHeightMm(c.total_height);

  const generalRows: ViewRow[] = [
    row(CONFIG_FIELD_LABELS.name, formatText(c.name)),
    row(CONFIG_FIELD_LABELS.description, formatText(c.description)),
    row(
      CONFIG_FIELD_LABELS.machine_type,
      formatEnumValue(c.machine_type, o.machineTypeOpts),
    ),
  ];
  if (isOmzMachine(c)) {
    generalRows.push(
      row(CONFIG_FIELD_LABELS.has_omz_paint, formatBoolean(c.has_omz_paint)),
    );
  }
  generalRows.push(
    row(CONFIG_FIELD_LABELS.total_height, formatNumber(c.total_height, "mm")),
    row(
      DERIVED_FIELD_LABELS.wash_height,
      washHeightMm !== null ? `${washHeightMm} mm` : EMPTY_DISPLAY,
    ),
  );

  const brushRows: ViewRow[] = [
    row(
      CONFIG_FIELD_LABELS.brush_qty,
      formatEnumValue(c.brush_qty, o.brushNums),
    ),
  ];
  if (hasBrushes(c)) {
    brushRows.push(
      row(
        CONFIG_FIELD_LABELS.brush_type,
        formatEnumValue(c.brush_type, o.brushTypes),
      ),
      row(
        CONFIG_FIELD_LABELS.brush_color,
        formatEnumValue(c.brush_color, o.brushColors),
      ),
    );
  }

  const chemRows: ViewRow[] = [
    row(
      CONFIG_FIELD_LABELS.has_shampoo_pump,
      formatBoolean(c.has_shampoo_pump),
    ),
    row(CONFIG_FIELD_LABELS.has_wax_pump, formatBoolean(c.has_wax_pump)),
    row(
      CONFIG_FIELD_LABELS.has_chemical_pump,
      formatBoolean(c.has_chemical_pump),
    ),
    row(CONFIG_FIELD_LABELS.has_acid_pump, formatBoolean(c.has_acid_pump)),
  ];
  if (showChemicalPumpDetails(c)) {
    chemRows.push(
      row(
        CONFIG_FIELD_LABELS.chemical_qty,
        formatEnumValue(c.chemical_qty, o.chemicalNum),
      ),
      row(
        CONFIG_FIELD_LABELS.chemical_pump_pos,
        formatEnumValue(c.chemical_pump_pos, o.chemicalPumpPositions),
      ),
      row(CONFIG_FIELD_LABELS.has_foam, formatBoolean(c.has_foam)),
    );
  }
  if (showAcidPumpDetails(c)) {
    chemRows.push(
      row(
        CONFIG_FIELD_LABELS.acid_pump_pos,
        formatEnumValue(c.acid_pump_pos, o.chemicalPumpPositions),
      ),
    );
  }

  const waterRows: ViewRow[] = [
    row(
      CONFIG_FIELD_LABELS.water_1_type,
      formatEnumValue(c.water_1_type, o.waterTypes),
    ),
    row(
      CONFIG_FIELD_LABELS.water_1_pump,
      formatEnumValue(c.water_1_pump, o.waterPump1Opts),
    ),
  ];
  if (isInverterPump1Selected(c)) {
    waterRows.push(
      row(
        CONFIG_FIELD_LABELS.inv_pump_outlet_dosatron_qty,
        formatNumber(c.inv_pump_outlet_dosatron_qty),
      ),
      row(
        CONFIG_FIELD_LABELS.inv_pump_outlet_pw_qty,
        formatNumber(c.inv_pump_outlet_pw_qty),
      ),
      row(
        CONFIG_FIELD_LABELS.has_filter_backwash,
        formatBoolean(c.has_filter_backwash),
      ),
    );
  }
  waterRows.push(
    row(
      CONFIG_FIELD_LABELS.water_2_type,
      formatEnumValue(c.water_2_type, o.waterTypes),
    ),
    row(
      CONFIG_FIELD_LABELS.water_2_pump,
      formatEnumValue(c.water_2_pump, o.waterPump2Opts),
    ),
    row(CONFIG_FIELD_LABELS.has_antifreeze, formatBoolean(c.has_antifreeze)),
  );

  const supplyFixingOptions = [
    ...o.supplyFixingTypes,
    ...o.supplyFixingTypesEnergyChain,
  ];
  const supplyRows: ViewRow[] = [
    row(
      CONFIG_FIELD_LABELS.supply_type,
      formatEnumValue(c.supply_type, o.supplyTypes),
    ),
    row(
      CONFIG_FIELD_LABELS.supply_fixing_type,
      formatEnumValue(c.supply_fixing_type, supplyFixingOptions),
    ),
  ];
  if (showPostFrame(c)) {
    supplyRows.push(
      row(CONFIG_FIELD_LABELS.has_post_frame, formatBoolean(c.has_post_frame)),
    );
  }
  supplyRows.push(
    row(
      CONFIG_FIELD_LABELS.supply_side,
      formatEnumValue(c.supply_side, o.supplySides),
    ),
  );

  const railRows: ViewRow[] = [
    row(
      CONFIG_FIELD_LABELS.rail_type,
      formatEnumValue(c.rail_type, o.railTypes),
    ),
  ];
  if (isAnchoredRail(c)) {
    railRows.push(
      row(
        CONFIG_FIELD_LABELS.anchor_type,
        formatEnumValue(c.anchor_type, o.anchorTypes),
      ),
    );
  }
  railRows.push(
    row(
      CONFIG_FIELD_LABELS.rail_length,
      formatEnumValue(c.rail_length, o.railLengths),
    ),
    row(
      CONFIG_FIELD_LABELS.rail_guide_qty,
      formatEnumValue(c.rail_guide_qty, o.railGuideNum),
    ),
  );

  const touchRows: ViewRow[] = [
    row(
      CONFIG_FIELD_LABELS.touch_qty,
      formatEnumValue(c.touch_qty, o.touchQtyOpts),
    ),
    row(
      CONFIG_FIELD_LABELS.touch_pos,
      formatEnumValue(c.touch_pos, o.touchPositionOpts),
    ),
    row(
      CONFIG_FIELD_LABELS.touch_fixing_type,
      formatEnumValue(c.touch_fixing_type, o.touchFixingTypeOpts),
    ),
    row(CONFIG_FIELD_LABELS.has_itecoweb, formatBoolean(c.has_itecoweb)),
    row(CONFIG_FIELD_LABELS.has_card_reader, formatBoolean(c.has_card_reader)),
    row(CONFIG_FIELD_LABELS.is_fast, formatBoolean(c.is_fast)),
    row(
      CONFIG_FIELD_LABELS.emergency_stop_qty,
      formatEnumValue(c.emergency_stop_qty, o.emergencyStopQtyOpts),
    ),
  ];
  if (showCardQty(c)) {
    touchRows.push(
      row(
        CONFIG_FIELD_LABELS.card_qty,
        formatEnumValue(c.card_qty, o.cardQtyOpts),
      ),
    );
  }

  const hpRows: ViewRow[] = [
    row(CONFIG_FIELD_LABELS.has_75kw_pump, formatBoolean(c.has_75kw_pump)),
  ];
  if (c.has_75kw_pump) {
    hpRows.push(
      row(
        CONFIG_FIELD_LABELS.pump_outlet_1_75kw,
        formatEnumValue(c.pump_outlet_1_75kw, o.hpPumpOutlet75kwTypes),
      ),
      row(
        CONFIG_FIELD_LABELS.pump_outlet_2_75kw,
        formatEnumValue(c.pump_outlet_2_75kw, o.hpPumpOutlet75kwTypes),
      ),
    );
  }
  hpRows.push(
    row(CONFIG_FIELD_LABELS.has_15kw_pump, formatBoolean(c.has_15kw_pump)),
  );
  if (c.has_15kw_pump) {
    hpRows.push(
      row(
        CONFIG_FIELD_LABELS.has_15kw_pump_softstart,
        formatBoolean(c.has_15kw_pump_softstart),
      ),
      row(
        CONFIG_FIELD_LABELS.pump_outlet_1_15kw,
        formatEnumValue(c.pump_outlet_1_15kw, o.hpPumpOutlet15kwTypes),
      ),
      row(
        CONFIG_FIELD_LABELS.pump_outlet_2_15kw,
        formatEnumValue(c.pump_outlet_2_15kw, o.hpPumpOutlet15kwTypes),
      ),
    );
  }
  hpRows.push(
    row(CONFIG_FIELD_LABELS.has_30kw_pump, formatBoolean(c.has_30kw_pump)),
  );
  if (c.has_30kw_pump) {
    hpRows.push(
      row(
        CONFIG_FIELD_LABELS.pump_outlet_1_30kw,
        formatEnumValue(c.pump_outlet_1_30kw, o.hpPumpOutlet30kwTypes),
      ),
      row(
        CONFIG_FIELD_LABELS.pump_outlet_2_30kw,
        formatEnumValue(c.pump_outlet_2_30kw, o.hpPumpOutlet30kwTypes),
      ),
    );
  }
  hpRows.push(
    row(CONFIG_FIELD_LABELS.has_omz_pump, formatBoolean(c.has_omz_pump)),
  );
  if (c.has_omz_pump) {
    hpRows.push(
      row(
        CONFIG_FIELD_LABELS.pump_outlet_omz,
        formatEnumValue(c.pump_outlet_omz, o.omzPumpOutletTypes),
      ),
    );
    if (showChemicalRoofBar(c)) {
      hpRows.push(
        row(
          CONFIG_FIELD_LABELS.has_chemical_roof_bar,
          formatBoolean(c.has_chemical_roof_bar),
        ),
      );
    }
  }
  if (showChassisWashSensor(c)) {
    hpRows.push(
      row(
        CONFIG_FIELD_LABELS.chassis_wash_sensor_type,
        formatEnumValue(
          c.chassis_wash_sensor_type,
          o.chassisWashSensorTypeOpts,
        ),
      ),
      row(
        CONFIG_FIELD_LABELS.has_chassis_wash_plates,
        formatBoolean(c.has_chassis_wash_plates),
      ),
    );
  }

  const miscRows: ViewRow[] = [
    row(
      CONFIG_FIELD_LABELS.has_chassis_wash_detergent_pump,
      formatBoolean(c.has_chassis_wash_detergent_pump),
    ),
  ];
  if (showManualAntifreeze(c)) {
    miscRows.push(
      row(
        CONFIG_FIELD_LABELS.has_chassis_wash_detergent_manual_antifreeze,
        formatBoolean(c.has_chassis_wash_detergent_manual_antifreeze),
      ),
    );
  }

  const notesRows: ViewRow[] = [
    row(CONFIG_FIELD_LABELS.sales_notes, formatText(c.sales_notes)),
    row(CONFIG_FIELD_LABELS.engineering_notes, formatText(c.engineering_notes)),
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
    row(
      WATER_TANK_FIELD_LABELS.type,
      formatEnumValue(tank.type, o.waterTankOpts),
    ),
    row(
      WATER_TANK_FIELD_LABELS.inlet_w_float_qty,
      formatNumber(tank.inlet_w_float_qty),
    ),
    row(
      WATER_TANK_FIELD_LABELS.inlet_no_float_qty,
      formatNumber(tank.inlet_no_float_qty),
    ),
    row(
      WATER_TANK_FIELD_LABELS.outlet_w_valve_qty,
      formatNumber(tank.outlet_w_valve_qty),
    ),
    row(
      WATER_TANK_FIELD_LABELS.outlet_no_valve_qty,
      formatNumber(tank.outlet_no_valve_qty),
    ),
  ];
  if (showTankBlowerAndFloat(tank)) {
    rows.push(
      row(WATER_TANK_FIELD_LABELS.has_blower, formatBoolean(tank.has_blower)),
      row(
        WATER_TANK_FIELD_LABELS.has_electric_float_for_purifier,
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
    row(WASH_BAY_FIELD_LABELS.hp_lance_qty, formatNumber(bay.hp_lance_qty)),
    row(WASH_BAY_FIELD_LABELS.det_lance_qty, formatNumber(bay.det_lance_qty)),
    row(
      WASH_BAY_FIELD_LABELS.pressure_washer_type,
      formatEnumValue(bay.pressure_washer_type, o.pressureWasherOpts),
    ),
    row(
      WASH_BAY_FIELD_LABELS.pressure_washer_qty,
      formatNumber(bay.pressure_washer_qty),
    ),
    row(WASH_BAY_FIELD_LABELS.has_gantry, formatBoolean(bay.has_gantry)),
    row(WASH_BAY_FIELD_LABELS.is_first_bay, formatBoolean(bay.is_first_bay)),
    row(
      WASH_BAY_FIELD_LABELS.has_bay_dividers,
      formatBoolean(bay.has_bay_dividers),
    ),
    row(
      WASH_BAY_FIELD_LABELS.has_weeping_lances,
      formatBoolean(bay.has_weeping_lances),
    ),
  ];

  const hoseReelRows: ViewRow[] = [
    row(
      WASH_BAY_FIELD_LABELS.hose_reel_hp_with_post_qty,
      formatNumber(bay.hose_reel_hp_with_post_qty),
    ),
    row(
      WASH_BAY_FIELD_LABELS.hose_reel_hp_without_post_qty,
      formatNumber(bay.hose_reel_hp_without_post_qty),
    ),
    row(
      WASH_BAY_FIELD_LABELS.hose_reel_det_with_post_qty,
      formatNumber(bay.hose_reel_det_with_post_qty),
    ),
    row(
      WASH_BAY_FIELD_LABELS.hose_reel_det_without_post_qty,
      formatNumber(bay.hose_reel_det_without_post_qty),
    ),
    row(
      WASH_BAY_FIELD_LABELS.hose_reel_hp_det_with_post_qty,
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
        row(
          WASH_BAY_FIELD_LABELS.energy_chain_width,
          formatEnumValue(bay.energy_chain_width, o.cableChainWidths),
        ),
        row(
          WASH_BAY_FIELD_LABELS.has_shelf_extension,
          formatBoolean(bay.has_shelf_extension),
        ),
        row(
          WASH_BAY_FIELD_LABELS.ec_signal_cable_qty,
          formatNumber(bay.ec_signal_cable_qty),
        ),
        row(
          WASH_BAY_FIELD_LABELS.ec_profinet_cable_qty,
          formatNumber(bay.ec_profinet_cable_qty),
        ),
        row(
          WASH_BAY_FIELD_LABELS.ec_water_1_tube_qty,
          formatNumber(bay.ec_water_1_tube_qty),
        ),
        row(
          WASH_BAY_FIELD_LABELS.ec_water_34_tube_qty,
          formatNumber(bay.ec_water_34_tube_qty),
        ),
        row(
          WASH_BAY_FIELD_LABELS.ec_r1_1_tube_qty,
          formatNumber(bay.ec_r1_1_tube_qty),
        ),
        row(
          WASH_BAY_FIELD_LABELS.ec_r2_1_tube_qty,
          formatNumber(bay.ec_r2_1_tube_qty),
        ),
        row(
          WASH_BAY_FIELD_LABELS.ec_r2_34_inox_tube_qty,
          formatNumber(bay.ec_r2_34_inox_tube_qty),
        ),
        row(
          WASH_BAY_FIELD_LABELS.ec_air_tube_qty,
          formatNumber(bay.ec_air_tube_qty),
        ),
      ],
    });
  }

  return { title: `Pista ${index}`, groups };
}
