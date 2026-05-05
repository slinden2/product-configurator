import { z } from "zod";
import { MachineTypes, STANDARD_MACHINE_HEIGHT_MM } from "@/types";
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
  total_height: z.coerce
    .number()
    .int()
    .positive()
    .default(STANDARD_MACHINE_HEIGHT_MM),
  has_omz_paint: z.boolean().default(false),
});
