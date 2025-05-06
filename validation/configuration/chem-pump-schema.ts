import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { z } from "zod";

export const ChemicalPumpPosEnum = z.enum(["ABOARD", "WASH_BAY"], {
  message: genericRequiredMessage,
});

export const chemicalPumpPositions: SelectOption[] =
  generateSelectOptionsFromZodEnum(ChemicalPumpPosEnum, [
    "A Bordo",
    "In Sala Tecnica",
  ]);

// Number of chem pumps
export const chemicalNum: SelectOption[] = [
  {
    value: 1,
    label: "Una pompa di prelavaggio",
  },
  {
    value: 2,
    label: "Due pompe di prelavaggio",
  },
];

const detergentPumpDiscriminatedUnion = z.discriminatedUnion(
  "has_chemical_pump",
  [
    z.object({
      has_chemical_pump: z.literal(false),
      chemical_qty: z.undefined(),
      chemical_pump_pos: z.undefined(),
      has_foam: z.literal(false),
    }),
    z.object({
      has_chemical_pump: z.literal(true),
      chemical_qty: z
        .number({
          invalid_type_error: "Quantità invalida",
          required_error: genericRequiredMessage,
        })
        .refine(
          (value) => chemicalNum.map((item) => item.value).includes(value),
          {
            message: "Numero di pompe di prelavaggio deve essere 1 o 2.",
          }
        ),
      chemical_pump_pos: ChemicalPumpPosEnum,
      has_foam: z.boolean().default(false),
    }),
  ]
);

const detergentPumpSchema = z
  .object({
    has_chemical_pump: z.boolean().default(false),
    has_foam: z.boolean().default(false),
  })
  .passthrough()
  .pipe(detergentPumpDiscriminatedUnion);

const acidPumpDiscriminatedUnion = z.discriminatedUnion("has_acid_pump", [
  z.object({
    has_acid_pump: z.literal(false),
    acid_pump_pos: z.undefined(),
  }),
  z.object({
    has_acid_pump: z.literal(true),
    acid_pump_pos: ChemicalPumpPosEnum,
  }),
]);

const acidPumpSchema = z
  .object({
    has_acid_pump: z.boolean().default(false),
  })
  .passthrough()
  .pipe(acidPumpDiscriminatedUnion);

export const chemPumpSchema = z
  .object({
    has_shampoo_pump: z.boolean().default(false),
    has_wax_pump: z.boolean().default(false),
  })
  .and(detergentPumpSchema)
  .and(acidPumpSchema)
  .superRefine((data, ctx) => {
    if (
      data.chemical_qty &&
      data.chemical_qty === 2 &&
      data.chemical_pump_pos === ChemicalPumpPosEnum.enum.ABOARD &&
      data.has_acid_pump &&
      data.acid_pump_pos === ChemicalPumpPosEnum.enum.ABOARD
    ) {
      const fieldNames: Array<"chemical_pump_pos" | "acid_pump_pos"> = [
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
