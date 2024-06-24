import { SelectOption } from "@/types";
import {
  emptyStringOrUndefined,
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
    value: "1",
    label: "Una pompa di prelavaggio",
  },
  {
    value: "2",
    label: "Due pompe di prelavaggio",
  },
];

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

export const chemPumpSchema = z
  .object({
    has_shampoo_pump: z.boolean().default(false),
    has_wax_pump: z.boolean().default(false),
  })
  .and(chemPumpDiscriminatedUnion)
  .and(acidPumpDiscriminatedUnion);
