import { z } from "zod";
import { ConfigurationStatus } from "@/types";
import { genericRequiredMessage } from "@/validation/common";

const configStatusEnum = z.enum(ConfigurationStatus, {
  error: genericRequiredMessage,
});

export const configStatusSchema = z.object({
  status: configStatusEnum,
});

export type ConfigStatusSchema = z.infer<typeof configStatusSchema>;
