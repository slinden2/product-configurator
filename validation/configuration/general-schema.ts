import { MachineTypes } from "@/types";
import { z } from "zod";
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
