import { SelectOption, SelectOptionGroup } from "@/types";
import { z } from "zod";

const genericRequiredMessage = "Scelta obbligatoria";

function z_enumFromArray(array: string[]) {
  return z.enum([array[0], ...array.slice(1)], {
    message: genericRequiredMessage,
  });
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
    label: "No spazzole",
  },
  {
    value: 2,
    label: "Due spazzole",
  },
  {
    value: 3,
    label: "Tre spazzole",
  },
];

// Number of brushes
const chemicalNum: SelectOption[] = [
  {
    value: 1,
    label: "Una pompa di prelavaggio",
  },
  {
    value: 2,
    label: "Due pompe di prelavaggio",
  },
];

export const selectFieldOptions: SelectOptionGroup = {
  brushNums,
  brushTypes,
  brushColors,
  chemicalNum,
  chemicalPumpPositions,
  supplySides,
  supplyTypes,
  supplyFixingTypes,
  cableChainWidths,
  waterTypes,
  railTypes,
};

// export const configSchema = z.object({
//   name: z.string().min(3, "Il nome è obbligatorio (min. 3 caratteri)."),
//   description: z.string().optional(),
//   brush_num: z
//     .string()
//     .transform((val) => parseInt(val, 10))
//     .refine((value) => brushNums.map((item) => item.value).includes(value), {
//       message: "Numero di spazzole deve essere 0, 2, or 3.",
//     }),
//   brush_type: BrushTypeEnum,
//   brush_color: BrushColorEnum,
//   has_shampoo_pump: z.boolean().default(false),
//   has_wax_pump: z.boolean().default(false),
//   has_chemical_pump: z.boolean().default(false),
//   has_acid_pump: z.boolean().default(false),
//   chemical_num: z
//     .string()
//     .transform((val) => parseInt(val, 10))
//     .refine((value) => chemicalNum.map((item) => item.value).includes(value), {
//       message: "Numero di pompe di prelavaggio deve essere 1 o 2.",
//     })
//     .optional(),
//   chemical_pump_pos: ChemicalPumpPosEnum.optional(),
//   acid_pump_pos: ChemicalPumpPosEnum.optional(),
//   // has_foam: z.boolean().optional(),
//   // has_hp_roof_bar: z.boolean(),
//   // has_chemical_roof_bar: z.boolean().optional(),
//   // has_high_spinners: z.boolean(),
//   // has_low_spinners: z.boolean(),
//   // has_short_hp_bars: z.boolean(),
//   // has_long_hp_bars: z.boolean(),
//   // supply_side: SupplySideEnum,
//   // supply_type: SupplyTypeEnum,
//   // supply_fixing_type: SupplyFixingTypeEnum,
//   // has_post_frame: z.boolean().optional(),
//   // cable_chain_width: CableChainWidthEnum.optional(),
//   // has_double_supply: z.boolean(),
//   // water_type_1: WaterTypeEnum,
//   // water_type_2: WaterTypeEnum.optional(),
//   // rail_type: RailTypeEnum,
//   // rail_length: z
//   //   .number()
//   //   .int()
//   //   .refine(
//   //     (val) => val >= 7 && val <= 26,
//   //     "La lunghezza deve essere tra 7 e 26 metri."
//   //   ),
//   // rail_guide_num: z
//   //   .number()
//   //   .int()
//   //   .refine(
//   //     (val) => val >= 0 && val <= 2,
//   //     "Le guide ruote (coppie) devono essere 0, 1 o 2."
//   //   ),
//   // has_itecoweb: z.boolean(),
// });

export const baseSchema = z.object({
  name: z.string().min(3, "Il nome è obbligatorio (min. 3 caratteri)."),
  description: z.string().optional(),
  brush_num: z
    .string({ message: genericRequiredMessage })
    .transform((val) => parseInt(val, 10))
    .refine((val) => brushNums.map((item) => item.value).includes(val), {
      message: `Numero di spazzole deve essere ${brushNums
        .map((item) => item.value)
        .join(", ")}.`,
    }),
  brush_type: BrushTypeEnum.optional(),
  brush_color: BrushColorEnum.optional(),
  has_shampoo_pump: z.boolean().default(false),
  has_wax_pump: z.boolean().default(false),
});

const chemPumpNumBase = z
  .string({ message: genericRequiredMessage })
  .transform((val) => parseInt(val, 10))
  .refine((value) => chemicalNum.map((item) => item.value).includes(value), {
    message: "Numero di pompe di prelavaggio deve essere 1 o 2.",
  });

const chemPumpDiscriminatedUnion = z.discriminatedUnion("has_chemical_pump", [
  z.object({
    has_chemical_pump: z.literal(undefined),
    chemical_num: chemPumpNumBase.optional(),
    chemical_pump_pos: ChemicalPumpPosEnum.optional(),
    has_foam: z.boolean().optional(),
  }),
  z.object({
    has_chemical_pump: z.literal(false),
    chemical_num: chemPumpNumBase.optional(),
    chemical_pump_pos: ChemicalPumpPosEnum.optional(),
    has_foam: z.boolean().optional(),
  }),
  z.object({
    has_chemical_pump: z.literal(true),
    chemical_num: chemPumpNumBase,
    chemical_pump_pos: ChemicalPumpPosEnum,
    has_foam: z.boolean().default(false),
  }),
]);

const acidPumpDiscriminatedUnion = z.discriminatedUnion("has_acid_pump", [
  z.object({
    has_acid_pump: z.literal(undefined),
    acid_pump_pos: z.undefined(),
  }),
  z.object({
    has_acid_pump: z.literal(false),
    acid_pump_pos: z.undefined(),
  }),
  z.object({
    has_acid_pump: z.literal(true),
    acid_pump_pos: ChemicalPumpPosEnum,
  }),
]);

const hpRoofBarDiscriminatedUnion = z.discriminatedUnion("has_hp_roof_bar", [
  z.object({
    has_hp_roof_bar: z.literal(undefined),
    has_chemical_roof_bar: z.undefined(),
  }),
  z.object({
    has_hp_roof_bar: z.literal(false),
    has_chemical_roof_bar: z.undefined(),
  }),
  z.object({
    has_hp_roof_bar: z.literal(true),
    has_chemical_roof_bar: z.boolean().default(false),
  }),
]);

export const configSchema = baseSchema
  .and(chemPumpDiscriminatedUnion)
  .and(acidPumpDiscriminatedUnion)
  .and(hpRoofBarDiscriminatedUnion)
  .superRefine((data, ctx) => {
    if (
      data.chemical_num &&
      data.chemical_num === 2 &&
      data.chemical_pump_pos === "ABOARD" &&
      data.has_acid_pump &&
      data.acid_pump_pos === "ABOARD"
    ) {
      const fieldNames: Array<keyof typeof data> = [
        "chemical_pump_pos",
        "acid_pump_pos",
      ];
      fieldNames.forEach((field) => {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "A bordo impianto si possono montare solo due pompe di prelavaggio.",
          path: [field],
        });
      });
    }

    if (data.brush_num > 0 && !data.brush_type) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["brush_type"],
      });
    }

    if (data.brush_num > 0 && !data.brush_color) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: genericRequiredMessage,
        path: ["brush_color"],
      });
    }
  });
