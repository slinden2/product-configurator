import { NOT_SELECTED_LABEL } from "@/lib/utils";
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
    label: NOT_SELECTED_LABEL,
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
  rail_length: z.coerce
    .number({ message: genericRequiredMessage })
    .min(7)
    .max(26),
  rail_guide_qty: z.coerce
    .number({ message: genericRequiredMessage })
    .min(0)
    .max(2),
});
