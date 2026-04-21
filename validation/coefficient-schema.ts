import { z } from "zod";
import { CoefficientSources } from "@/types";

export const coefficientSchema = z.object({
  pn: z.string().min(1),
  coefficient: z.coerce
    .number()
    .positive()
    .max(5)
    .transform((v) => v.toFixed(2)),
  source: z.enum(CoefficientSources),
});

export const coefficientUpdateSchema = coefficientSchema.omit({ source: true });
