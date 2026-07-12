import { z } from "zod";
import { MachineTypes, STANDARD_MACHINE_HEIGHT_MM } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";

export const MachineTypeEnum = z.enum(MachineTypes, {
  error: genericRequiredMessage,
});

export const machineTypeOpts = generateSelectOptionsFromZodEnum(
  MachineTypeEnum,
  { STD: "Standard", OMZ: "OMZ" },
);

export const generalSchema = z.object({
  total_height: z.coerce
    .number()
    .int()
    .positive()
    .default(STANDARD_MACHINE_HEIGHT_MM),
  has_omz_paint: z.boolean().default(false),
});
