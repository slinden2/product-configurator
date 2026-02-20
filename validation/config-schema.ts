import { brushSchema } from "@/validation/configuration/brush-schema";
import { chemPumpSchema } from "@/validation/configuration/chem-pump-schema";
import { hpPumpSchema } from "@/validation/configuration/hp-pump-schema";
import { touchSchema } from "@/validation/configuration/touch-schema";
import { railSchema } from "@/validation/configuration/rail-schema";
import { supplyTypeSchema } from "@/validation/configuration/supply-type-schema";
import { waterSupplySchema } from "@/validation/configuration/water-supply-schema";
import { z } from "zod";
import { zodEnums } from "./configuration";

export const baseSchema = z.object({
  name: z.string().min(3, "Il nome è obbligatorio (min. 3 caratteri)."),
  description: z.string().default(""),
});

export const configSchema = baseSchema
  .and(brushSchema)
  .and(chemPumpSchema)
  .and(waterSupplySchema)
  .and(supplyTypeSchema)
  .and(railSchema)
  .and(hpPumpSchema)
  .and(touchSchema)
  .superRefine((data, ctx) => {
    // Limit rail length to 25 if cable chain width is set
    if (data.energy_chain_width && data.rail_length && data.rail_length < 25) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Con la catena portacavi le rotaie devono essere almeno 25 metri.",
        path: ["rail_length"],
      });
    }
    // Limit rail length to 7 if is_fast is set
    if (data.is_fast && data.rail_length && data.rail_length > 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Per un portale fast le rotaie devono essere da 7 metri.",
        path: ["rail_length"],
      });
    }
    // Disallow chemical pump if brush quantity is 0
    if (data.brush_qty === 0 && data.has_shampoo_pump) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Non puoi selezionare la pompa sapone se non ci sono spazzole.",
      })
    }
    // Disallow acid pump if brush quantity is 2
    if (data.brush_qty === 2 && data.has_acid_pump) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Non puoi selezionare la pompa acido per un portale a 2 spazzole.",
      })
    }
    // Disallow OMZ pump for 2 brush configurations
    if (data.brush_qty === 2 && data.has_omz_pump) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Non puoi selezionare la pompa OMZ per un portale a 2 spazzole.",
      })
    }
  });

export type ConfigSchema = z.infer<typeof configSchema>;

export const updateConfigSchema = configSchema.and(
  z.object({ user_id: z.string() })
);

export type UpdateConfigSchema = z.infer<typeof updateConfigSchema>;

export const selectConfigSchema = configSchema.and(
  z.object({ id: z.number(), user_id: z.string() })
);

export type SelectConfigSchema = z.infer<typeof selectConfigSchema>;

export const configDefaults: ConfigSchema = {
  name: "",
  description: "",
  // --- Brush Section ---
  brush_qty: undefined,
  brush_type: undefined,
  brush_color: undefined,
  // --- Chem Pump Section ---
  has_chemical_pump: false,
  chemical_qty: undefined,
  chemical_pump_pos: undefined,
  has_acid_pump: false,
  acid_pump_pos: undefined,
  has_shampoo_pump: false,
  has_wax_pump: false,
  has_foam: false,
  // --- Water Supply Section ---
  water_1_type: undefined,
  water_1_pump: undefined,
  water_2_type: undefined,
  water_2_pump: undefined,
  has_antifreeze: false,
  inv_pump_outlet_dosatron_qty: 0,
  inv_pump_outlet_pw_qty: 0,
  // --- Supply Section ---
  supply_type: undefined,
  supply_fixing_type: undefined,
  has_post_frame: false,
  energy_chain_width: undefined,
  has_shelf_extension: false,
  supply_side: undefined,
  // --- Rail Section ---
  rail_type: undefined,
  rail_length: undefined,
  rail_guide_qty: 0,
  // --- HP Pump Section ---
  has_15kw_pump: false,
  pump_outlet_1_15kw: undefined,
  pump_outlet_2_15kw: undefined,
  has_30kw_pump: false,
  pump_outlet_1_30kw: undefined,
  pump_outlet_2_30kw: undefined,
  has_omz_pump: false,
  pump_outlet_omz: undefined,
  has_chemical_roof_bar: false,
  // --- Touch Section
  has_itecoweb: false,
  has_card_reader: false,
  card_qty: 0,
  is_fast: false,
  touch_qty: undefined,
  touch_pos: undefined,
  touch_fixing_type: undefined,
};
