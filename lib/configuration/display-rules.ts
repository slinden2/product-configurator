import { WASH_HEIGHT_OFFSET_MM } from "@/types";
import type { ConfigSchema } from "@/validation/config-schema";
import { hasAnyChassisWashOutlet } from "@/validation/configuration/hp-pump-schema";
import type { WashBaySchema } from "@/validation/wash-bay-schema";
import type { WaterTankSchema } from "@/validation/water-tank-schema";

/**
 * Pure, single-source conditional-display predicates for the configuration.
 *
 * Both the editable form (config-form section components) and the read-only
 * view/PDF consume these, so the "which field/section is shown" logic can never
 * drift between editing and viewing. Each predicate accepts only the fields it
 * needs (`Pick<...>`), so callers can pass either a watched-value object (form)
 * or the whole validated config (view/PDF).
 */

// --- General ---

export const isOmzMachine = (c: Pick<ConfigSchema, "machine_type">): boolean =>
  c.machine_type === "OMZ";

/** Wash height derived from total height; null when not computable. */
export const getWashHeightMm = (
  totalHeight: number | string | undefined | null,
): number | null => {
  const n = Number(totalHeight);
  return Number.isFinite(n) && n > WASH_HEIGHT_OFFSET_MM
    ? n - WASH_HEIGHT_OFFSET_MM
    : null;
};

// --- Brush ---

/** True when a brush count is selected and greater than zero. */
export const hasBrushes = (c: Pick<ConfigSchema, "brush_qty">): boolean =>
  c.brush_qty !== undefined && c.brush_qty !== 0;

// --- Chemical pumps ---

export const showChemicalPumpDetails = (
  c: Pick<ConfigSchema, "has_chemical_pump">,
): boolean => !!c.has_chemical_pump;

export const showAcidPumpDetails = (
  c: Pick<ConfigSchema, "has_acid_pump">,
): boolean => !!c.has_acid_pump;

/**
 * Shampoo requires brushes: unavailable only when the user explicitly selected
 * zero brushes. An unselected brush count keeps the checkbox available
 * (deliberately laxer than `hasBrushes`, which also excludes `undefined`).
 */
export const canHaveShampooPump = (
  c: Pick<ConfigSchema, "brush_qty">,
): boolean => c.brush_qty !== 0;

/** The acid pump is not available on two-brush machines. */
export const canHaveAcidPump = (c: Pick<ConfigSchema, "brush_qty">): boolean =>
  c.brush_qty !== 2;

// --- Water supply ---

export const isInverterPump1Selected = (
  c: Pick<ConfigSchema, "water_1_pump">,
): boolean =>
  c.water_1_pump === "INV_3KW_200L" || c.water_1_pump === "INV_3KW_250L";

// --- Supply ---

export const showPostFrame = (
  c: Pick<ConfigSchema, "supply_type" | "supply_fixing_type">,
): boolean =>
  (c.supply_type === "BOOM" || c.supply_type === "STRAIGHT_SHELF") &&
  c.supply_fixing_type === "POST";

export const showEnergyChainWallWarning = (
  c: Pick<ConfigSchema, "supply_type" | "supply_fixing_type">,
): boolean =>
  c.supply_type === "ENERGY_CHAIN" && c.supply_fixing_type === "WALL";

// --- Rail ---

export const isAnchoredRail = (c: Pick<ConfigSchema, "rail_type">): boolean =>
  c.rail_type === "ANCHORED";

// --- HP pumps ---

export const showChemicalRoofBar = (
  c: Pick<ConfigSchema, "pump_outlet_omz">,
): boolean =>
  c.pump_outlet_omz === "HP_ROOF_BAR" ||
  c.pump_outlet_omz === "HP_ROOF_BAR_SPINNERS";

export const showChassisWashSensor = (
  c: Pick<
    ConfigSchema,
    | "pump_outlet_1_15kw"
    | "pump_outlet_2_15kw"
    | "pump_outlet_1_30kw"
    | "pump_outlet_2_30kw"
    | "pump_outlet_1_75kw"
    | "pump_outlet_2_75kw"
  >,
): boolean =>
  hasAnyChassisWashOutlet({
    pump_outlet_1_15kw: c.pump_outlet_1_15kw,
    pump_outlet_2_15kw: c.pump_outlet_2_15kw,
    pump_outlet_1_30kw: c.pump_outlet_1_30kw,
    pump_outlet_2_30kw: c.pump_outlet_2_30kw,
    pump_outlet_1_75kw: c.pump_outlet_1_75kw,
    pump_outlet_2_75kw: c.pump_outlet_2_75kw,
  });

// --- Touch ---

export const showCardQty = (
  c: Pick<ConfigSchema, "has_itecoweb" | "has_card_reader">,
): boolean => !!c.has_itecoweb || !!c.has_card_reader;

// --- Misc ---

export const showManualAntifreeze = (
  c: Pick<ConfigSchema, "has_chassis_wash_detergent_pump" | "has_antifreeze">,
): boolean => !!c.has_chassis_wash_detergent_pump && !!c.has_antifreeze;

// --- Water tanks ---

export const showTankBlowerAndFloat = (
  c: Pick<WaterTankSchema, "inlet_no_float_qty">,
): boolean => c.inlet_no_float_qty === 1;

// --- Wash bays ---

export const washBayHasHpSource = (
  c: Pick<
    WashBaySchema,
    | "hp_lance_qty"
    | "hose_reel_hp_with_post_qty"
    | "hose_reel_hp_without_post_qty"
    | "hose_reel_hp_det_with_post_qty"
  >,
): boolean =>
  (c.hp_lance_qty ?? 0) > 0 ||
  (c.hose_reel_hp_with_post_qty ?? 0) > 0 ||
  (c.hose_reel_hp_without_post_qty ?? 0) > 0 ||
  (c.hose_reel_hp_det_with_post_qty ?? 0) > 0;

export const showWashBayEnergyChainFields = (
  c: Pick<WashBaySchema, "has_gantry">,
  supplyType: ConfigSchema["supply_type"],
): boolean => !!c.has_gantry && supplyType === "ENERGY_CHAIN";
