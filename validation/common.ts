import type { z } from "zod";
import type { SelectOption } from "@/types";

export const genericRequiredMessage = "Scelta obbligatoria";
export const invalidOption = "Opzione invalida";

export function generateSelectOptionsFromZodEnum<
  T extends Record<string, string>,
>(enumObject: z.ZodEnum<T>, labels: string[]): SelectOption[] {
  return enumObject.options.map((value, i) => ({
    value,
    label: labels[i],
  }));
}

export const getNumericSelectOptions = (numArr: number[]): SelectOption[] => {
  return numArr.map((num) => ({
    value: num,
    label: num.toString(),
  }));
};
