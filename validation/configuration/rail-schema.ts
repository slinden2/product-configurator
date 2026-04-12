import { z } from "zod";
import { NOT_SELECTED_LABEL } from "@/lib/utils";
import { AnchorTypes, RailTypes, type SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";

export const RailTypeEnum = z.enum(RailTypes, {
  message: genericRequiredMessage,
});
export const railTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  RailTypeEnum,
  ["Da tassellare", "Da saldare", "Da saldare incassato"],
);

export const AnchorTypeEnum = z.enum(AnchorTypes, {
  message: genericRequiredMessage,
});
export const anchorTypes: SelectOption[] = generateSelectOptionsFromZodEnum(
  AnchorTypeEnum,
  ["Zincato", "Chimico"],
);

export const railLengths: SelectOption[] = [
  { value: 7, label: "7 metri" },
  { value: 21, label: "21 metri" },
  { value: 25, label: "25 metri" },
  { value: 26, label: "26 metri" },
];

// Number of guide rails
export const railGuideNum: SelectOption[] = [
  {
    value: 0,
    label: NOT_SELECTED_LABEL,
  },
  {
    value: 1,
    label: "Una coppia",
  },
  {
    value: 2,
    label: "Due coppie",
  },
  {
    value: 3,
    label: "Tre coppie",
  },
];

export const railSchema = z
  .object({
    rail_type: RailTypeEnum.optional(),
    rail_length: z.coerce
      .number({ message: genericRequiredMessage })
      .refine((val) => railLengths.map((opt) => opt.value).includes(val), {
        message: "Lunghezza rotaie non valida.",
      })
      .optional(),
    rail_guide_qty: z.coerce
      .number({ message: genericRequiredMessage })
      .min(0)
      .max(3)
      .default(0),
    anchor_type: AnchorTypeEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.rail_type === undefined) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["rail_type"],
      });
    }
    if (data.rail_length === undefined) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["rail_length"],
      });
    }
    if (data.rail_type === "ANCHORED" && data.anchor_type === undefined) {
      ctx.addIssue({
        code: "custom",
        message: genericRequiredMessage,
        path: ["anchor_type"],
      });
    }
  });
