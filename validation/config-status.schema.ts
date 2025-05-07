import { ConfigurationStatus, SelectOption } from "@/types";
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
    "Aperto",
    "Bloccato",
    "Chiuso",
  ]);

export const configStatusSchema = z.object({
  status: configStatusEnum,
});

export type ConfigStatusSchema = z.infer<typeof configStatusSchema>;
