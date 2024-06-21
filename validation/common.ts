import { z } from "zod";
import { SelectOption } from "@/types";

export const genericRequiredMessage = "Scelta obbligatoria";

export function generateSelectOptionsFromZodEnum<T extends string>(
  enumObject: z.ZodEnum<[T, ...T[]]>,
  labels: string[]
): SelectOption[] {
  return enumObject._def.values.map((value: T, i) => ({
    value,
    label: labels[i],
  }));
}

export function coerceStringToNumber(schema: z.ZodTypeAny) {
  return z.preprocess((val) => {
    if (val === "") return undefined;
    return val && typeof val === "string" ? parseInt(val, 10) : val;
  }, schema);
}
