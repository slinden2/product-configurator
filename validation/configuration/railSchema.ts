import { SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { z } from "zod";

export const RailTypeEnum = z.enum(["DOWELED", "WELDED"], {
  message: genericRequiredMessage,
});
export const railTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  RailTypeEnum,
  ["Da tassellare", "Da saldare incassato"]
);

export const railLengths: SelectOption[] = [
  { value: "7", label: "7 metri" },
  { value: "21", label: "21 metri" },
  { value: "25", label: "25 metri" },
  { value: "26", label: "26 metri" },
];

// Number of guide rails
export const railGuideNum: SelectOption[] = [
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

export const railSchema = z.object({
  rail_type: RailTypeEnum,
  rail_length: z
    .string()
    .min(1, { message: genericRequiredMessage })
    .refine(
      (val) => parseInt(val, 10) >= 7 && parseInt(val, 10) <= 26,
      "La lunghezza deve essere tra 7 e 26 metri."
    ),
  rail_guide_qty: z
    .string()
    .min(1, { message: genericRequiredMessage })
    .refine(
      (val) => parseInt(val, 10) >= 0 && parseInt(val, 10) <= 2,
      "Le guide ruote (coppie) devono essere 0, 1 o 2."
    ),
});
