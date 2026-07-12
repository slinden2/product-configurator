import type * as React from "react";
import {
  type FieldPath,
  type FieldValues,
  type PathValue,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { useFormDisabled } from "@/components/shared/form-disabled-context";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NOT_SELECTED_LABEL, NOT_SELECTED_VALUE } from "@/lib/utils";
import type { SelectOption } from "@/types";

interface ResetConfig<TFieldValues extends FieldValues> {
  triggerValue: string | string[] | number | number[] | boolean | boolean[]; // Value(s) that trigger the reset; compared via toString()
  fieldsToReset: Array<FieldPath<TFieldValues>>;
  invertTrigger?: boolean; // Reset when value is NOT triggerValue
  // `unknown` because fieldsToReset is heterogeneous — a single per-field
  // value type isn't expressible here; callers must match the Zod schema type.
  resetToValue?: unknown;
}

interface SelectFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: FieldPath<TFieldValues>;
  label: string;
  description?: React.ReactNode;
  disabled?: boolean;
  items: SelectOption[];
  dataType: "string" | "number" | "boolean"; // Must match the Zod schema field type
  fieldsToResetOnValue?: Array<ResetConfig<TFieldValues>>;
  fieldsToRevalidate?: Array<FieldPath<TFieldValues>>;
}

/**
 * A reusable SelectField component integrated with React Hook Form.
 * Handles internal type conversion based on the `dataType` prop,
 * reducing the need for Zod coercion in schemas for select inputs.
 * Supports conditional resetting of other fields.
 *
 * @example Basic Usage
 * <SelectField
 * name="userCount" // Field expects a number
 * label="Number of Users"
 * dataType="number"
 * items={[{value: 1, label: 'One'}, {value: 5, label: 'Five'}]}
 * />
 *
 * @example With Reset Logic
 * <SelectField<MyFormValues> // Specify form types for full type safety
 * name="country" // Field expects a string
 * label="Country"
 * dataType="string"
 * items={[{value: 'US', label: 'United States'}, {value: 'CA', label: 'Canada'}]}
 * fieldsToResetOnValue={[
 * // Reset 'state' to undefined when country is NOT 'US'
 * { triggerValue: 'US', fieldsToReset: ['state'], invertTrigger: true, resetToValue: undefined }
 * ]}
 * />
 *
 * @important If deselecting is needed, prepend the sentinel option with
 * `withNoSelection(items)` (lib/utils). Never use `""` as an item value —
 * Radix Select throws on `<SelectItem value="">`; the sentinel is
 * NOT_SELECTED_VALUE ("null"), which this component parses to `undefined`.
 */
const SelectField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  disabled,
  items,
  dataType,
  fieldsToResetOnValue,
  fieldsToRevalidate,
}: SelectFieldProps<TFieldValues>) => {
  const { control, setValue, trigger } = useFormContext<TFieldValues>();
  const formDisabled = useFormDisabled();

  // This is needed, because when resetting fields the UI
  // doesn't update until correctly using the field object
  // in the FormField component. There was a weird bug, where
  // the fields would reset (in RHF dev tools value was undefined),
  // but the UI would not update with the empty placeholder.
  const watchedValue = useWatch({ control, name });

  const parseValue = (
    val: string,
  ): PathValue<TFieldValues, FieldPath<TFieldValues>> | undefined => {
    if (val === NOT_SELECTED_VALUE) {
      return undefined;
    }

    switch (dataType) {
      case "number": {
        const num = parseFloat(val);
        return Number.isNaN(num)
          ? undefined
          : (num as PathValue<TFieldValues, FieldPath<TFieldValues>>);
      }
      case "boolean":
        if (val.toLowerCase() === "true")
          return true as PathValue<TFieldValues, FieldPath<TFieldValues>>;
        if (val.toLowerCase() === "false")
          return false as PathValue<TFieldValues, FieldPath<TFieldValues>>;
        return undefined;
      default:
        return val as PathValue<TFieldValues, FieldPath<TFieldValues>>;
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const stringValueForSelectTrigger =
          watchedValue !== null && watchedValue !== undefined
            ? watchedValue.toString()
            : "";

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select
              // Force Radix to remount when transitioning between "has a value"
              // and "no value". Radix does not reliably clear its displayed text
              // when the controlled value changes to "" after having shown a real
              // selection; remounting resets Radix's internal display state.
              // Keyed on the trigger string (not watchedValue == null) so a
              // legitimate "" value also remounts — same symptom, same fix.
              key={stringValueForSelectTrigger === "" ? "empty" : "has-value"}
              name={field.name}
              value={stringValueForSelectTrigger}
              onValueChange={(selectedValueString) => {
                const parsedTypedValue = parseValue(selectedValueString);
                field.onChange(parsedTypedValue);
                field.onBlur();

                fieldsToResetOnValue?.forEach((item) => {
                  const triggerValues = Array.isArray(item.triggerValue)
                    ? item.triggerValue.map((v) => v.toString())
                    : [item.triggerValue.toString()];

                  const shouldReset = item.invertTrigger
                    ? !triggerValues.includes(selectedValueString)
                    : triggerValues.includes(selectedValueString);

                  if (shouldReset) {
                    item.fieldsToReset.forEach((fieldToReset) => {
                      const valueToSet = (item.resetToValue ??
                        undefined) as PathValue<
                        TFieldValues,
                        FieldPath<TFieldValues>
                      >;

                      setValue(fieldToReset, valueToSet, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: false,
                      });
                    });
                  }
                });

                // Validate this field only after the dependent resets above have
                // been applied. A cross-field rule that reads a dependent (e.g.
                // "water_1_pump requires water_1_type") would otherwise see the
                // pre-reset value and strand an error here that nothing clears:
                // the resets' own shouldValidate only revalidates the reset fields.
                trigger(name);

                fieldsToRevalidate?.forEach((fieldToRevalidate) => {
                  trigger(fieldToRevalidate);
                });
              }}
              disabled={disabled || formDisabled}
            >
              <FormControl>
                {/* field.ref lets RHF focus this field on validation error */}
                <SelectTrigger ref={field.ref} className="bg-background">
                  <SelectValue placeholder={NOT_SELECTED_LABEL} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-background">
                {items.map((item, index) => {
                  const itemValueString = item.value.toString();
                  const itemKey = `select-item-${name}-${index}-${itemValueString}`;

                  return (
                    <SelectItem key={itemKey} value={itemValueString}>
                      {item.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default SelectField;
