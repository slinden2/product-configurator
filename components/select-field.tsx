import * as React from "react";
import {
  useFormContext,
  FieldValues,
  FieldPath,
  PathValue,
} from "react-hook-form";
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
import { SelectOption } from "@/types";
import { NOT_SELECTED_LABEL, NOT_SELECTED_VALUE } from "@/lib/utils";

// Interface for the reset configuration, now using generics
interface ResetConfig<TFieldValues extends FieldValues> {
  triggerValue: string | string[] | number | number[]; // Value(s) that trigger the reset
  fieldsToReset: Array<FieldPath<TFieldValues>>; // Fields to reset (type-safe)
  invertTrigger?: boolean; // Reset when value is NOT triggerValue
  resetToValue?: any; // Value to reset the fields to (defaults to undefined)
}

// --- SelectField Props Interface with Generics ---
interface SelectFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: FieldPath<TFieldValues>; // Type-safe field name
  label: string;
  description?: string;
  disabled?: boolean;
  items: SelectOption[]; // Array of options { value: string | number, label: string }
  dataType: "string" | "number" | "boolean"; // *** NEW: Specify expected data type ***
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
 * @important Add an empty option manually to `items` if deselecting is needed:
 * const options = [{value: 1, label: 'One'}, {value: 5, label: 'Five'}];
 * const itemsWithEmpty = [{ value: "", label: NOT_SELECTED_LABEL }, ...options];
 * // Pass itemsWithEmpty to the component
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

  // --- Internal Type Parsing Logic ---
  const parseValue = (
    val: string // Value from Select is always string
  ): PathValue<TFieldValues, FieldPath<TFieldValues>> | undefined => {
    if (val === NOT_SELECTED_VALUE) {
      return undefined;
    }

    switch (dataType) {
      case "number":
        const num = parseFloat(val);
        return isNaN(num)
          ? undefined
          : (num as PathValue<TFieldValues, FieldPath<TFieldValues>>);
      case "boolean":
        if (val.toLowerCase() === "true")
          return true as PathValue<TFieldValues, FieldPath<TFieldValues>>;
        if (val.toLowerCase() === "false")
          return false as PathValue<TFieldValues, FieldPath<TFieldValues>>;
        return undefined;
      case "string":
      default:
        return val as PathValue<TFieldValues, FieldPath<TFieldValues>>;
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // Map RHF undefined/null state to "" for the main Select component value.
        // This allows the <SelectValue placeholder> to show correctly.
        const stringValueForSelectTrigger =
          field.value !== null && field.value !== undefined
            ? field.value.toString()
            : ""; // Use "" ONLY for the trigger state when RHF value is undefined/null

        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select
              value={stringValueForSelectTrigger}
              onValueChange={(selectedValueString) => {
                const parsedTypedValue = parseValue(selectedValueString);
                field.onChange(parsedTypedValue);

                fieldsToResetOnValue?.forEach((item) => {
                  const triggerValues = Array.isArray(item.triggerValue)
                    ? item.triggerValue.map((v) => v.toString())
                    : [item.triggerValue.toString()];

                  const shouldReset = item.invertTrigger
                    ? !triggerValues.includes(selectedValueString)
                    : triggerValues.includes(selectedValueString);

                  if (shouldReset) {
                    item.fieldsToReset.forEach((fieldToReset) => {
                      const valueToSet =
                        item.resetToValue !== undefined
                          ? item.resetToValue
                          : undefined;

                      setValue(fieldToReset, valueToSet, {
                        shouldValidate: false,
                        shouldDirty: true,
                      });
                    });
                  }
                });

                fieldsToRevalidate?.forEach((fieldToRevalidate) => {
                  trigger(fieldToRevalidate);
                });
              }}
              disabled={disabled}>
              <FormControl>
                <SelectTrigger className="bg-background">
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
