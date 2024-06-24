import { SelectOption, SelectOptionGroup } from "@/types";
import {
  BrushColorEnum,
  BrushTypeEnum,
  brushColors,
  brushNums,
  brushTypes,
  brushDiscriminatedUnion,
} from "@/validation/brushSchema";
import {
  emptyStringOrUndefined,
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import {
  WaterType1Enum,
  WaterType2Enum,
  boosterPumpEnum,
  boosterPumps,
  waterSupplySchema,
  waterTypes1,
  waterTypes2,
} from "@/validation/waterSupplySchema";
import { z } from "zod";

const ChemicalPumpPosEnum = z.enum(["ABOARD", "WASH_BAY"], {
  message: genericRequiredMessage,
});
const chemicalPumpPositions: SelectOption[] = generateSelectOptionsFromZodEnum(
  ChemicalPumpPosEnum,
  ["A Bordo", "In Sala Tecnica"]
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

const SupplyFixingTypeEnum = z.enum(["NONE", "POST", "WALL"], {
  required_error: genericRequiredMessage,
});
const SupplyFixingTypeNoNoneEnum = z.enum(["POST", "WALL"], {
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

const RailTypeEnum = z.enum(["DOWELED", "WELDED"], {
  message: genericRequiredMessage,
});
const railTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  RailTypeEnum,
  ["Da tassellare", "Da saldare incassato"]
);

const PanelNumEnum = z.enum(["ONE", "TWO"]);
const panelNums: SelectOption[] = generateSelectOptionsFromZodEnum(
  PanelNumEnum,
  ["1", "2"]
);

const PanelPosEnum = z.enum(["INTERNAL", "EXTERNAL"], {
  message: genericRequiredMessage,
});
const panelPositions: SelectOption[] = generateSelectOptionsFromZodEnum(
  PanelPosEnum,
  ["A bordo", "In piazzola"]
);

const ExtPanelFixingType = z.enum(["WALL", "POST"], {
  message: genericRequiredMessage,
});
const extPanelFixingTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  ExtPanelFixingType,
  ["A muro", "Su palo"]
);

// Number of chem pumps
const chemicalNum: SelectOption[] = [
  {
    value: "1",
    label: "Una pompa di prelavaggio",
  },
  {
    value: "2",
    label: "Due pompe di prelavaggio",
  },
];

// Number of guide rails
const railGuideNum: SelectOption[] = [
  {
    value: "0",
    label: "Niente",
  },
  {
    value: "1",
    label: "Una coppia",
  },
  {
    value: "2",
    label: "Due coppie",
  },
];

export const zodEnums = {
  BrushTypeEnum,
  BrushColorEnum,
  ChemicalPumpPosEnum,
  SupplyTypeEnum,
  CableChainWidthEnum,
  SupplyFixingTypeEnum,
  SupplySideEnum,
  WaterType1Enum,
  WaterType2Enum,
  boosterPumpEnum,
  RailTypeEnum,
  PanelNumEnum,
  PanelPosEnum,
  ExtPanelFixingType,
};

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
  waterTypes1,
  waterTypes2,
  boosterPumps,
  railTypes,
  railGuideNum,
  panelNums,
  panelPositions,
  extPanelFixingTypes,
};

export const baseSchema = z.object({
  name: z.string().min(3, "Il nome è obbligatorio (min. 3 caratteri)."),
  description: z.string().optional(),
  has_shampoo_pump: z.boolean().default(false),
  has_wax_pump: z.boolean().default(false),
  supply_side: SupplySideEnum,
  rail_type: RailTypeEnum,
  rail_length: z
    .string()
    .min(1, { message: genericRequiredMessage })
    .refine(
      (val) => parseInt(val, 10) >= 7 && parseInt(val, 10) <= 26,
      "La lunghezza deve essere tra 7 e 26 metri."
    ),
  rail_guide_num: z
    .string()
    .min(1, { message: genericRequiredMessage })
    .refine(
      (val) => parseInt(val, 10) >= 0 && parseInt(val, 10) <= 2,
      "Le guide ruote (coppie) devono essere 0, 1 o 2."
    ),
  has_itecoweb: z.boolean().default(false),
  has_card_reader: z.boolean().default(false),
  card_num: z
    .string()
    .refine((val) => !isNaN(parseInt(val, 10)), {
      message: "Devi inserire un numero.",
    })
    .or(emptyStringOrUndefined().transform(() => undefined)),
});

const chemPumpDiscriminatedUnion = z.discriminatedUnion("has_chemical_pump", [
  z.object({
    has_chemical_pump: z.literal(undefined).transform((val) => Boolean(val)),
    chemical_num: emptyStringOrUndefined().transform(() => undefined),
    chemical_pump_pos: emptyStringOrUndefined().transform(() => undefined),
    has_foam: emptyStringOrUndefined().transform((val) => Boolean(val)),
  }),
  z.object({
    has_chemical_pump: z.literal(false),
    chemical_num: emptyStringOrUndefined().transform(() => undefined),
    chemical_pump_pos: emptyStringOrUndefined().transform(() => undefined),
    has_foam: emptyStringOrUndefined().transform((val) => Boolean(val)),
  }),
  z.object({
    has_chemical_pump: z.literal(true),
    chemical_num: z
      .string({ message: genericRequiredMessage })
      .refine(
        (value) => chemicalNum.map((item) => item.value).includes(value),
        {
          message: "Numero di pompe di prelavaggio deve essere 1 o 2.",
        }
      ),
    chemical_pump_pos: ChemicalPumpPosEnum,
    has_foam: z
      .boolean()
      .default(false)
      .or(emptyStringOrUndefined().transform((val) => Boolean(val))),
  }),
]);

const acidPumpDiscriminatedUnion = z.discriminatedUnion("has_acid_pump", [
  z.object({
    has_acid_pump: z.literal(undefined).transform((val) => Boolean(val)),
    acid_pump_pos: emptyStringOrUndefined().transform(() => undefined),
  }),
  z.object({
    has_acid_pump: z.literal(false),
    acid_pump_pos: emptyStringOrUndefined().transform(() => undefined),
  }),
  z.object({
    has_acid_pump: z.literal(true),
    acid_pump_pos: ChemicalPumpPosEnum,
  }),
]);

export const supplyTypeDiscriminatedUnion = z.discriminatedUnion(
  "supply_type",
  [
    z.object({
      supply_type: z
        .literal(undefined)
        .refine(() => false, { message: genericRequiredMessage }),
      supply_fixing_type: emptyStringOrUndefined(),
      has_post_frame: emptyStringOrUndefined().transform((val) => Boolean(val)),
      cable_chain_width: emptyStringOrUndefined().transform(() => undefined),
    }),
    z.object({
      supply_type: z.literal(SupplyTypeEnum.enum.STRAIGHT_SHELF),
      supply_fixing_type: SupplyFixingTypeEnum,
      has_post_frame: emptyStringOrUndefined().transform((val) => Boolean(val)),
      cable_chain_width: emptyStringOrUndefined().transform(() => undefined),
    }),
    z.object({
      supply_type: z.literal(SupplyTypeEnum.enum.BOOM),
      supply_fixing_type: SupplyFixingTypeNoNoneEnum,
      has_post_frame: emptyStringOrUndefined()
        .transform((val) => Boolean(val))
        .or(z.boolean().default(false)),
      cable_chain_width: emptyStringOrUndefined().transform(() => undefined),
    }),
    z.object({
      supply_type: z.literal(SupplyTypeEnum.enum.CABLE_CHAIN),
      supply_fixing_type: SupplyFixingTypeNoNoneEnum,
      has_post_frame: emptyStringOrUndefined().transform((val) => Boolean(val)),
      cable_chain_width: CableChainWidthEnum,
    }),
  ]
);

const panelNumDiscriminatedUnion = z.discriminatedUnion("panel_num", [
  z.object({
    panel_num: z.literal(undefined).refine((val) => (!val ? false : val), {
      message: genericRequiredMessage,
    }),
    panel_pos: emptyStringOrUndefined().transform(() => undefined),
  }),
  z.object({
    panel_num: z.literal(PanelNumEnum.enum.ONE),
    panel_pos: PanelPosEnum,
  }),
  z.object({
    panel_num: z.literal(PanelNumEnum.enum.TWO),
    panel_pos: emptyStringOrUndefined().transform(() => undefined),
    ext_panel_fixing_type: ExtPanelFixingType,
  }),
]);

const panelPosDiscriminatedUnion = z.discriminatedUnion("panel_pos", [
  z.object({
    panel_pos: z.literal(undefined),
    ext_panel_fixing_type: ExtPanelFixingType.or(emptyStringOrUndefined()),
  }),
  z.object({
    panel_pos: z.literal("").transform(() => undefined),
    ext_panel_fixing_type: ExtPanelFixingType.or(emptyStringOrUndefined()),
  }),
  z.object({
    panel_pos: z.literal(PanelPosEnum.enum.EXTERNAL),
    ext_panel_fixing_type: ExtPanelFixingType,
  }),
  z.object({
    panel_pos: z.literal(PanelPosEnum.enum.INTERNAL),
    ext_panel_fixing_type: emptyStringOrUndefined().transform(() => undefined),
  }),
]);

export const configSchema = baseSchema
  .and(brushDiscriminatedUnion)
  .and(waterSupplySchema)
  .and(chemPumpDiscriminatedUnion)
  .and(acidPumpDiscriminatedUnion)
  .and(supplyTypeDiscriminatedUnion)
  .and(panelNumDiscriminatedUnion)
  .and(panelPosDiscriminatedUnion)
  .superRefine((data, ctx) => {
    if (
      data.chemical_num &&
      data.chemical_num === "2" &&
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
  });
