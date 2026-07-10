import { z } from "zod";
import { CoefficientSources } from "@/types";

// Matches price_coefficients.pn: varchar(25).
export const coefficientPnSchema = z.string().min(1).max(25);

export const coefficientSchema = z.object({
  pn: coefficientPnSchema,
  coefficient: z.coerce
    .number()
    .positive()
    .max(5)
    .transform((v) => v.toFixed(2)),
  source: z.enum(CoefficientSources),
});

export const coefficientUpdateSchema = coefficientSchema.omit({ source: true });
