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

export function emptyStringOrUndefined() {
  return z.union([
    z.string().refine((value) => value === "", { message: "Opzione invalida" }),
    z.undefined(),
  ]);
}

export const getNumericSelectOptions = (numArr: number[]): SelectOption[] => {
  return numArr.map((num) => ({
    value: num.toString(),
    label: num.toString(),
  }));
};
