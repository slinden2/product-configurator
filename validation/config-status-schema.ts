import { ConfigurationStatus, type SelectOption } from "@/types";
import {
  generateSelectOptionsFromZodEnum,
  genericRequiredMessage,
} from "@/validation/common";
import { z } from "zod";

const configStatusEnum = z.enum(ConfigurationStatus, {
  message: genericRequiredMessage,
});

export const configStatusOpts: SelectOption[] =
  generateSelectOptionsFromZodEnum(configStatusEnum, [
    "Bozza",
    "Inviato",
    "In revisione",
    "Approvato",
    "Chiuso",
  ]);

export const configStatusSchema = z.object({
  status: configStatusEnum,
});

export type ConfigStatusSchema = z.infer<typeof configStatusSchema>;
