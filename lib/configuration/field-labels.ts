import type { ConfigSchema } from "@/validation/config-schema";
import type { WashBaySchema } from "@/validation/wash-bay-schema";
import type { WaterTankSchema } from "@/validation/water-tank-schema";

/**
 * Single-source Italian field labels for the configuration and its sub-records.
 *
 * Consumed by the editable form (config-form sections + sub-record field
 * components) and by the read-only view/PDF, so a label edit propagates to all
 * surfaces and they can never drift. Keys are the English schema field names;
 * values are the user-facing Italian strings.
 */

export const CONFIG_FIELD_LABELS = {
  // General
  name: "Nome del cliente",
  description: "Descrizione",
  machine_type: "Tipo impianto",
  has_omz_paint: "Verniciatura",
  total_height: "Altezza totale",
  // Brush
  brush_qty: "Numero di spazzole",
  brush_type: "Tipo di setole",
  brush_color: "Colore di setole",
  // Chemical pumps
  has_shampoo_pump: "Pompa sapone",
  has_wax_pump: "Pompa cera",
  has_chemical_pump: "Pompa prelavaggio",
  has_acid_pump: "Pompa acido",
  chemical_qty: "Numero di pompe di prelavaggio",
  chemical_pump_pos: "Posizione delle pompe di prelavaggio",
  has_foam: "Nebulizzazione con schiuma",
  acid_pump_pos: "Posizione della pompa acido",
  // Water supply
  water_1_type: "Tipo acqua 1",
  water_1_pump: "Pompa di rilancio",
  inv_pump_outlet_dosatron_qty: "Uscite Dosatron",
  inv_pump_outlet_pw_qty: "Uscite idropulitrice",
  has_filter_backwash: "Uscita controlavaggio filtro",
  water_2_type: "Tipo acqua 2",
  water_2_pump: "Pompa di rilancio",
  has_antifreeze: "Scarico invernale",
  // Supply
  supply_type: "Tipo di alimentazione",
  supply_fixing_type: "Tipo di fissaggio",
  has_post_frame: "Con telaio e coperchio",
  supply_side: "Lato di alimentazione",
  // Rail
  rail_type: "Tipo di rotaie",
  anchor_type: "Tipo di tassello",
  rail_length: "Lunghezza rotaie",
  rail_guide_qty: "Guida ruote",
  // HP pumps
  has_75kw_pump: "Pompa 7.5kW",
  pump_outlet_1_75kw: "Uscita 1",
  pump_outlet_2_75kw: "Uscita 2",
  has_15kw_pump: "Pompa 15kW",
  pump_outlet_1_15kw: "Uscita 1",
  has_15kw_pump_softstart: "Con softstart",
  pump_outlet_2_15kw: "Uscita 2",
  has_30kw_pump: "Pompa 30kW",
  pump_outlet_1_30kw: "Uscita 1",
  pump_outlet_2_30kw: "Uscita 2",
  has_omz_pump: "Pompa OMZ",
  pump_outlet_omz: "Uscita 1",
  has_chemical_roof_bar: "Con barra di prelavaggio",
  chassis_wash_sensor_type: "Sensore ultrasuoni lavachassis",
  has_chassis_wash_plates: "Piastre lavachassis",
  // Touch / electrical panel
  touch_qty: "Numero di pannelli",
  touch_pos: "Posizione touch",
  touch_fixing_type: "Fissaggio touch esterno",
  has_itecoweb: "Itecoweb",
  has_card_reader: "Lettore schede",
  is_fast: "Portale fast",
  emergency_stop_qty: "Fungo di emergenza esterno",
  card_qty: "Numero di schede",
  // Misc
  has_chassis_wash_detergent_pump: "Lavachassis con detergente",
  has_chassis_wash_detergent_manual_antifreeze: "Antigelo manuale",
  // Notes
  sales_notes: "Note commerciali",
  engineering_notes: "Note tecniche",
} satisfies Partial<Record<keyof ConfigSchema, string>>;

export const WATER_TANK_FIELD_LABELS = {
  type: "Tipo di serbatoio",
  inlet_w_float_qty: "Ingressi c/ galleggiante",
  inlet_no_float_qty: "Ingressi no galleggiante",
  outlet_w_valve_qty: "Uscite c/ rubinetto",
  outlet_no_valve_qty: "Uscite no rubinetto",
  has_blower: "Con soffiante",
  has_electric_float_for_purifier: "Galleggiante elettrico per depuratore",
} satisfies Partial<Record<keyof WaterTankSchema, string>>;

export const WASH_BAY_FIELD_LABELS = {
  hp_lance_qty: "Linea trolley HP",
  det_lance_qty: "Linea trolley detergente",
  pressure_washer_type: "Tipo idropulitrice",
  pressure_washer_qty: "Numero idropulitrici",
  has_gantry: "Pista con portale",
  is_first_bay: "Prima pista",
  has_bay_dividers: "Con pannellature",
  has_weeping_lances: "Pistole perdenti",
  hose_reel_hp_with_post_qty: "HP con palo",
  hose_reel_hp_without_post_qty: "HP senza palo",
  hose_reel_det_with_post_qty: "Detergente con palo",
  hose_reel_det_without_post_qty: "Detergente senza palo",
  hose_reel_hp_det_with_post_qty: "HP+Detergente con palo",
  energy_chain_width: "Larghezza catena",
  has_shelf_extension: "Con prolunga per mensola alim.",
  ec_signal_cable_qty: "Cavo segnali 12G1",
  ec_profinet_cable_qty: "Cavo Profinet",
  ec_water_1_tube_qty: 'Tubo acqua 1"',
  ec_water_34_tube_qty: 'Tubo acqua 3/4"',
  ec_r1_1_tube_qty: 'Tubo R1 1"',
  ec_r2_1_tube_qty: 'Tubo R2 1"',
  ec_r2_34_inox_tube_qty: 'Tubo R2 3/4" INOX',
  ec_air_tube_qty: "Tubo aria 8x17",
} satisfies Partial<Record<keyof WashBaySchema, string>>;

/** Labels for computed/derived read-only values that are not schema fields. */
export const DERIVED_FIELD_LABELS = {
  wash_height: "Altezza di lavaggio",
} as const;
