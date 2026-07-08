import type { z } from "zod";
import type { SelectOption } from "@/types";

export const genericRequiredMessage = "Scelta obbligatoria";
export const invalidOption = "Opzione invalida";

/**
 * Builds `SelectOption[]` from a Zod string enum and a key→label map.
 *
 * The `labels` argument is keyed by enum value, not positional, so it is
 * order-independent and **exhaustive at compile time**: omitting a value or
 * adding an unknown key is a `tsc` error, and reordering the enum can no longer
 * silently shift labels onto the wrong value.
 */
export function generateSelectOptionsFromZodEnum<
  T extends Record<string, string>,
>(
  enumObject: z.ZodEnum<T>,
  labels: Record<T[keyof T], string>,
): SelectOption[] {
  return enumObject.options.map((value) => ({
    value,
    label: labels[value],
  }));
}

export const getNumericSelectOptions = (numArr: number[]): SelectOption[] => {
  return numArr.map((num) => ({
    value: num,
    label: num.toString(),
  }));
};
