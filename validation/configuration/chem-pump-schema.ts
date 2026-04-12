import { ChemPumpPos, type SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { z } from "zod";

export const ChemicalPumpPosEnum = z.enum(ChemPumpPos, {
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

export const chemPumpSchema = z
  .object({
    has_shampoo_pump: z.boolean().default(false),
    has_wax_pump: z.boolean().default(false),
    has_chemical_pump: z.boolean().default(false),
    chemical_qty: z
      .number({ error: genericRequiredMessage })
      .refine(
        (value) => chemicalNum.map((item) => item.value).includes(value),
        { message: "Numero di pompe di prelavaggio deve essere 1 o 2." },
      )
      .optional(),
    chemical_pump_pos: ChemicalPumpPosEnum.optional(),
    has_foam: z.boolean().default(false),
    has_acid_pump: z.boolean().default(false),
    acid_pump_pos: ChemicalPumpPosEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.has_chemical_pump) {
      if (data.chemical_qty === undefined) {
        ctx.addIssue({
          code: "custom",
          message: genericRequiredMessage,
          path: ["chemical_qty"],
        });
      }
      if (data.chemical_pump_pos === undefined) {
        ctx.addIssue({
          code: "custom",
          message: genericRequiredMessage,
          path: ["chemical_pump_pos"],
        });
      }
    }

    if (data.has_acid_pump && data.acid_pump_pos === undefined) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["acid_pump_pos"],
      });
    }

    if (
      data.chemical_qty === 2 &&
      data.chemical_pump_pos === ChemicalPumpPosEnum.enum.ONBOARD &&
      data.has_acid_pump &&
      data.acid_pump_pos === ChemicalPumpPosEnum.enum.ONBOARD
    ) {
      for (const field of ["chemical_pump_pos", "acid_pump_pos"] as const) {
        ctx.addIssue({
          code: "custom",
          message:
            "A bordo impianto si possono montare solo due pompe di prelavaggio.",
          path: [field],
        });
      }
    }
  });
