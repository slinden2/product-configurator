import { ConfigSchema } from "@/validation/config-schema";
import { configurations } from "@/db/schemas"; // Import Drizzle schema
import { WaterTankSchema } from "@/validation/water-tank-schema";

// Type for Drizzle insert
type DbConfigInsert = typeof configurations.$inferInsert;
// Type for Drizzle update set object
type DbConfigSet = Partial<typeof configurations.$inferSelect>;

// Helper function for common field mapping (Zod -> DB compatible values)
// Returns a type suitable for Drizzle's .set() or as a base for .values()
type MappedConfigData = Partial<typeof configurations.$inferSelect>;

function mapConfigSchemaToDbCompatible(values: ConfigSchema): MappedConfigData {
  return {
    name: values.name,
    description: values.description,

    // --- NOT NULL in DB (Zod refinement must ensure value exists) ---
    // Assert type as Zod refine guarantees it's not undefined
    brush_qty: values.brush_qty as number,
    has_shampoo_pump: values.has_shampoo_pump,
    has_wax_pump: values.has_wax_pump,
    has_chemical_pump: values.has_chemical_pump,
    has_foam: values.has_foam,
    has_acid_pump: values.has_acid_pump,
    water_1_type: values.water_1_type as
      | "NETWORK"
      | "RECYCLED"
      | "DEMINERALIZED",
    has_antifreeze: values.has_antifreeze,
    supply_type: values.supply_type as
      | "STRAIGHT_SHELF"
      | "BOOM"
      | "CABLE_CHAIN",
    supply_side: values.supply_side as "TBD" | "LEFT" | "RIGHT",
    has_post_frame: values.has_post_frame,
    rail_type: values.rail_type as "DOWELED" | "WELDED",
    rail_length: values.rail_length as number,
    rail_guide_qty: values.rail_guide_qty,
    touch_qty: values.touch_qty as number,
    has_itecoweb: values.has_itecoweb,
    has_card_reader: values.has_card_reader,
    is_fast: values.is_fast,
    card_qty: values.card_qty,
    has_15kw_pump: values.has_15kw_pump,
    has_30kw_pump: values.has_30kw_pump,
    has_omz_pump: values.has_omz_pump,
    has_chemical_roof_bar: values.has_chemical_roof_bar,

    // --- NULLABLE in DB (Map undefined -> null) ---
    brush_type: values.brush_type ?? null,
    brush_color: values.brush_color ?? null,
    chemical_qty: values.chemical_qty ?? null,
    chemical_pump_pos: values.chemical_pump_pos ?? null,
    acid_pump_pos: values.acid_pump_pos ?? null,
    water_1_pump: values.water_1_pump ?? null,
    inv_pump_outlet_dosatron_qty: values.inv_pump_outlet_dosatron_qty ?? null,
    inv_pump_outlet_pw_qty: values.inv_pump_outlet_pw_qty ?? null,
    water_2_type: values.water_2_type ?? null,
    water_2_pump: values.water_2_pump ?? null,
    supply_fixing_type: values.supply_fixing_type ?? null,
    energy_chain_width: values.energy_chain_width ?? null,
    touch_pos: values.touch_pos ?? null,
    touch_fixing_type: values.touch_fixing_type ?? null,
    pump_outlet_1_15kw: values.pump_outlet_1_15kw ?? null,
    pump_outlet_2_15kw: values.pump_outlet_2_15kw ?? null,
    pump_outlet_1_30kw: values.pump_outlet_1_30kw ?? null,
    pump_outlet_2_30kw: values.pump_outlet_2_30kw ?? null,
    pump_outlet_omz: values.pump_outlet_omz ?? null,
  };
}

export function transformConfigToDbInsert(
  values: ConfigSchema,
  userId: string
): DbConfigInsert {
  const commonData = mapConfigSchemaToDbCompatible(values);
  return {
    ...commonData,
    user_id: userId,
  } as DbConfigInsert;
}

// Public function for UPDATE transformation
export function transformConfigToDbUpdate(values: ConfigSchema): DbConfigSet {
  const commonData = mapConfigSchemaToDbCompatible(values);
  return commonData;
}

export function transformDbNullToUndefined(data: Record<string, unknown>) {
  const newDataObj = { ...data };
  for (const key in newDataObj) {
    if (data[key] === null) {
      data[key] = undefined;
    }
  }
  return data;
}

export function transformWaterTankSchemaToDbData(values: WaterTankSchema) {
  return {
    ...values,
    type: values.type as "L2000" | "L2000_JOLLY" | "L2500" | "L4500",
  };
}
