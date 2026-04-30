import { z } from "zod";
import { MachineTypes } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";

export const MachineTypeEnum = z.enum(MachineTypes, {
  message: genericRequiredMessage,
});

export const machineTypeOpts = generateSelectOptionsFromZodEnum(
  MachineTypeEnum,
  ["Standard", "OMZ"],
);

export const generalSchema = z.object({
  total_height: z.coerce.number().int().positive().optional(),
  has_omz_paint: z.boolean().default(false),
});
