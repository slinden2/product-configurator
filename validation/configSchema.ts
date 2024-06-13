import { SelectOption, SelectOptionGroup } from "@/types";
import { z } from "zod";

function z_enumFromArray(array: string[]) {
  return z.enum([array[0], ...array.slice(1)]);
}

// Brush Type
const brushTypes: SelectOption[] = [
  { value: "THREAD", label: "Filo" },
  { value: "MIXED", label: "Misto" },
  { value: "CARLITE", label: "Carlite" },
];

const BrushTypeEnum = z_enumFromArray(
  brushTypes.map((item) => item.value.toString())
);

// Brush Color
const brushColors: SelectOption[] = [
  { value: "BLUE_SILVER", label: "Blu/Argento" },
  { value: "GREEN_SILVER", label: "Verde/Argento" },
  { value: "RED", label: "Rosso" },
  { value: "GREEN_BLACK", label: "Verde/Nero" },
];
const BrushColorEnum = z_enumFromArray(
  brushColors.map((item) => item.value.toString())
);

// Chemical Pump Position
const chemicalPumpPositions: SelectOption[] = [
  { value: "ABOARD", label: "A Bordo" },
  { value: "WASH_BAY", label: "In Sala Tecnica" },
];
const ChemicalPumpPosEnum = z_enumFromArray(
  chemicalPumpPositions.map((item) => item.value.toString())
);

// Supply Side
const supplySides: SelectOption[] = [
  { value: "LEFT", label: "Sinistra" },
  { value: "RIGHT", label: "Destra" },
];
const SupplySideEnum = z_enumFromArray(
  supplySides.map((item) => item.value.toString())
);

// Supply Type
const supplyTypes: SelectOption[] = [
  { value: "STRAIGHT_SHELF", label: "Mensola Dritta" },
  { value: "BOOM", label: "Braccio Mobile" },
  { value: "CABLE_CHAIN", label: "Catena Portacavi" },
];
const SupplyTypeEnum = z_enumFromArray(
  supplyTypes.map((item) => item.value.toString())
);

// Supply Fixing Type
const supplyFixingTypes: SelectOption[] = [
  { value: "WALL", label: "Parete" },
  { value: "FLOOR", label: "Pavimento" },
];
const SupplyFixingTypeEnum = z_enumFromArray(
  supplyFixingTypes.map((item) => item.value.toString())
);

// Cable Chain Width
const cableChainWidths: SelectOption[] = [
  { value: "L150", label: "ST072S.150.R300" },
  { value: "L200", label: "ST072S.200.R300" },
  { value: "L250", label: "ST072S.250.R300" },
  { value: "L300", label: "ST072S.300.R300" },
];
const CableChainWidthEnum = z_enumFromArray(
  cableChainWidths.map((item) => item.value.toString())
);

// Water Type
const waterTypes: SelectOption[] = [
  { value: "NETWORK", label: "Rete" },
  { value: "RECYCLED", label: "Riciclata" },
  { value: "DEMINERALIZED", label: "Demineralizzata" },
];
const WaterTypeEnum = z_enumFromArray(
  waterTypes.map((item) => item.value.toString())
);

// Rail Type
const railTypes: SelectOption[] = [
  { value: "DOWELED", label: "Da tassellare" },
  { value: "WELDED", label: "Da saldare incassato" },
];
const RailTypeEnum = z_enumFromArray(
  railTypes.map((item) => item.value.toString())
);

// Number of brushes
const brushNums: SelectOption[] = [
  {
    value: 0,
    label: "Zero",
  },
  {
    value: 2,
    label: "Due",
  },
  {
    value: 3,
    label: "Tre",
  },
];

export const selectFieldOptions: SelectOptionGroup = {
  brushNums,
  brushTypes,
};

export const configSchema = z.object({
  name: z.string().min(3, "Il nome è obbligatorio (min. 3 caratteri)."),
  description: z.string().optional(),
  brush_num: z
    .string()
    .transform((val) => parseInt(val, 10))
    .refine((value) => [0, 2, 3].includes(value), {
      message: "Numero di spazzole deve essere 0, 2, or 3",
    }),
  brush_type: BrushTypeEnum,
  brush_color: BrushColorEnum,
  has_shampoo_pump: z.boolean(),
  has_wax_pump: z.boolean(),
  has_chemical_pump: z.boolean(),
  chemical_num: z.number().int().optional(),
  chemical_pump_pos: ChemicalPumpPosEnum.optional(),
  has_foam: z.boolean().optional(),
  has_acid_pump: z.boolean(),
  has_hp_roof_bar: z.boolean(),
  has_chemical_roof_bar: z.boolean().optional(),
  has_high_spinners: z.boolean(),
  has_low_spinners: z.boolean(),
  has_short_hp_bars: z.boolean(),
  has_long_hp_bars: z.boolean(),
  supply_side: SupplySideEnum,
  supply_type: SupplyTypeEnum,
  supply_fixing_type: SupplyFixingTypeEnum,
  has_post_frame: z.boolean().optional(),
  cable_chain_width: CableChainWidthEnum.optional(),
  has_double_supply: z.boolean(),
  water_type_1: WaterTypeEnum,
  water_type_2: WaterTypeEnum.optional(),
  rail_type: RailTypeEnum,
  rail_length: z
    .number()
    .int()
    .refine(
      (val) => val >= 7 && val <= 26,
      "La lunghezza deve essere tra 7 e 26 metri."
    ),
  rail_guide_num: z
    .number()
    .int()
    .refine(
      (val) => val >= 0 && val <= 2,
      "Le guide ruote (coppie) devono essere 0, 1 o 2."
    ),
  has_itecoweb: z.boolean(),
});
