import { SelectOption, SelectOptionGroup } from "@/types";
import { z } from "zod";

function generateSelectOptionsFromZodEnum<T extends string>(
  enumObject: z.ZodEnum<[T, ...T[]]>,
  labels: string[]
): SelectOption[] {
  return enumObject._def.values.map((value: T, i) => ({
    value,
    label: labels[i],
  }));
}

const genericRequiredMessage = "Scelta obbligatoria";

const BrushTypeEnum = z.enum(["THREAD", "MIXED", "CARLITE"], {
  message: genericRequiredMessage,
});
const brushTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  BrushTypeEnum,
  ["Filo", "Misto", "Carlite"]
);

const BrushColorEnum = z.enum(
  ["BLUE_SILVER", "GREEN_SILVER", "RED", "GREEN_BLACK"],
  { message: genericRequiredMessage }
);
const brushColors: SelectOption[] = generateSelectOptionsFromZodEnum(
  BrushColorEnum,
  ["Blu/Argento", "Verde/Argento", "Rosso", "Verde/Nero"]
);

const ChemicalPumpPosEnum = z.enum(["ABOARD", "WASH_BAY"], {
  message: genericRequiredMessage,
});
const chemicalPumpPositions: SelectOption[] = generateSelectOptionsFromZodEnum(
  ChemicalPumpPosEnum,
  ["A Bordo", "In Sala Tecnica"]
);

const HPGantryTypeEnum = z.enum(
  ["NO_SELECTION", "LOW_SPINNER", "LOW_BAR", "HIGH_BAR", "LOW_HIGH_SPINNER"],
  { message: genericRequiredMessage }
);
const hp20barGantryTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  HPGantryTypeEnum,
  [
    "Niente",
    "2 robottine basse",
    "Barre HP basse",
    "Barre HP alte",
    "2+4 robottine",
  ]
);

const SupplyTypeEnum = z.enum(["STRAIGHT_SHELF", "BOOM", "CABLE_CHAIN"], {
  message: genericRequiredMessage,
});
const supplyTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  SupplyTypeEnum,
  ["Mensola Dritta", "Braccio Mobile", "Catena Portacavi"]
);

const CableChainWidthEnum = z.enum(["L150", "L200", "L250", "L300"], {
  message: genericRequiredMessage,
});
const cableChainWidths: SelectOption[] = generateSelectOptionsFromZodEnum(
  CableChainWidthEnum,
  ["ST072S.150.R300", "ST072S.200.R300", "ST072S.250.R300", "ST072S.300.R300"]
);

const SupplyFixingTypeEnum = z.enum(["NONE", "FLOOR", "WALL"], {
  required_error: genericRequiredMessage,
});
const SupplyFixingTypeNoNoneEnum = z.enum(["FLOOR", "WALL"], {
  errorMap: () => ({
    message:
      "Il tipo di fissaggio deve essere Palo o Staffa a muro per Braccio Mobile o Catena Portacavi.",
  }),
});
const supplyFixingTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  SupplyFixingTypeEnum,
  ["Niente", "Palo alimentazione", "Staffa a muro"]
);

const SupplySideEnum = z.enum(["TBD", "LEFT", "RIGHT"], {
  message: genericRequiredMessage,
});
const supplySides: SelectOption[] = generateSelectOptionsFromZodEnum(
  SupplySideEnum,
  ["Da definire", "Sinistra", "Destra"]
);

const WaterTypeEnum = z.enum(["NETWORK", "RECYCLED", "DEMINERALIZED"], {
  message: genericRequiredMessage,
});
const waterTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  WaterTypeEnum,
  ["Rete", "Riciclata", "Demineralizzata"]
);

const RailTypeEnum = z.enum(["DOWELED", "WELDED"], {
  message: genericRequiredMessage,
});
const railTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  RailTypeEnum,
  ["Da tassellare", "Da saldare incassato"]
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

export const zodEnums = {
  BrushTypeEnum,
  BrushColorEnum,
  ChemicalPumpPosEnum,
  HPGantryTypeEnum,
  SupplyTypeEnum,
  CableChainWidthEnum,
  SupplyFixingTypeEnum,
  SupplySideEnum,
  WaterTypeEnum,
  RailTypeEnum,
};

export const selectFieldOptions: SelectOptionGroup = {
  brushNums,
  brushTypes,
  brushColors,
  chemicalNum,
  chemicalPumpPositions,
  hp20barGantryTypes,
  supplySides,
  supplyTypes,
  supplyFixingTypes,
  cableChainWidths,
  waterTypes,
  railTypes,
};

// export const configSchema = z.object({
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
  low_hp_gantry: HPGantryTypeEnum.transform((val) =>
    val === "NO_SELECTION" ? undefined : val
  ),
  has_high_spinners: z.boolean().default(false),
  supply_side: SupplySideEnum,
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

const supplyTypeDiscriminatedUnion = z.discriminatedUnion("supply_type", [
  z.object({
    supply_type: z.literal("STRAIGHT_SHELF"),
    supply_fixing_type: SupplyFixingTypeEnum,
    has_post_frame: z.literal(false).or(z.undefined()),
    cable_chain_width: z.undefined(),
  }),
  z.object({
    supply_type: z.literal("BOOM"),
    supply_fixing_type: SupplyFixingTypeNoNoneEnum,
    has_post_frame: z.boolean().or(z.undefined()),
    cable_chain_width: z.undefined(),
  }),
  z.object({
    supply_type: z.literal("CABLE_CHAIN"),
    supply_fixing_type: SupplyFixingTypeNoNoneEnum,
    has_post_frame: z.literal(false).or(z.undefined()),
    cable_chain_width: CableChainWidthEnum,
  }),
]);

export const configSchema = baseSchema
  .and(chemPumpDiscriminatedUnion)
  .and(acidPumpDiscriminatedUnion)
  .and(hpRoofBarDiscriminatedUnion)
  .and(supplyTypeDiscriminatedUnion)
  .superRefine((data, ctx) => {
    if (
      data.chemical_num &&
      data.chemical_num === 2 &&
      data.chemical_pump_pos === ChemicalPumpPosEnum.enum.ABOARD &&
      data.has_acid_pump &&
      data.acid_pump_pos === ChemicalPumpPosEnum.enum.ABOARD
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

    if (
      data.supply_type === "BOOM" &&
      data.supply_fixing_type !== "FLOOR" &&
      data.has_post_frame
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Non puoi selezionare telaio e coperchio senza palo alimentazione.",
        path: ["has_post_frame"],
      });
    }
  });
