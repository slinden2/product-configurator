import { z } from "zod";
import { SelectOption } from "@/types";

export const genericRequiredMessage = "Scelta obbligatoria";
export const invalidOption = "Opzione invalida";
export const NOT_SELECTED_VALUE = "NO_SELECTION";

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
    z.literal(false),
  ]);
}

export const getNumericSelectOptions = (numArr: number[]): SelectOption[] => {
  return numArr.map((num) => ({
    value: num.toString(),
    label: num.toString(),
  }));
};

export function mustBeUndefined() {
  return z.coerce
    .boolean()
    .refine((val) => !val, { message: "Opzione invalida" })
    .transform(() => null)
    .or(z.null());
}

export function mustBeFalse() {
  return z.coerce
    .boolean()
    .refine((val) => !val)
    .transform(() => false);
}

export function mustBeZero() {
  return z.coerce
    .boolean()
    .refine((val) => !val)
    .transform(() => 0);
}

export function preprocessEmptyStringOrNotSelectedToNull<T>(
  validation: z.ZodType<T>
) {
  return z.preprocess((val) => {
    if (val === NOT_SELECTED_VALUE) return null;
    if (val === "") return null;
    return val;
  }, validation);
}
