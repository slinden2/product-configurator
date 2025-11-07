import * as React from "react";
import {
  useFormContext,
  FieldValues,
  FieldPath,
  // PathValue, // Less critical here, but can keep for consistency
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage, // Import FormMessage for displaying errors
} from "@/components/ui/form";
import type { CheckedState } from "@radix-ui/react-checkbox"; // Import type for clarity

// Interface for the reset configuration, using generics
interface ResetCheckboxConfig<TFieldValues extends FieldValues> {
  fieldsToReset: Array<FieldPath<TFieldValues>>; // Fields to reset (type-safe)
  resetToValue?: any; // Value to reset the fields to (defaults to undefined)
}

// --- CheckboxField Props Interface with Generics ---
interface CheckboxFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: FieldPath<TFieldValues>; // Type-safe field name
  label: string;
  description?: string;
  disabled?: boolean;
  // Changed prop name slightly for consistency, accepts array of configs
  fieldsToResetOnUncheck?: Array<ResetCheckboxConfig<TFieldValues>>;
  // Value that triggers reset (usually 'false' for checkboxes, but could be configurable)
  // Let's make it simple: reset always happens when value becomes false (unchecked)
}

/**
 * A reusable CheckboxField component integrated with React Hook Form.
 * Ensures that the form state is updated with a boolean value (true/false),
 * reducing the need for Zod coercion for checkbox inputs.
 * Supports conditional resetting of other fields when unchecked.
 */
const CheckboxField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  disabled,
  fieldsToResetOnUncheck, // Use the updated prop name
}: CheckboxFieldProps<TFieldValues>) => {
  const { control, setValue, formState } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name} // Pass the generic name directly
      render={({ field, fieldState }) => {
        // Include fieldState for potential error styling
        // Determine the checked state for the UI component.
        // Treat undefined, null, or anything else as unchecked (false).
        const isChecked = field.value === true;

        return (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-2">
            <FormControl>
              <Checkbox
                checked={isChecked}
                onCheckedChange={(checked: CheckedState) => {
                  // Convert CheckedState (boolean | 'indeterminate') to a definite boolean.
                  // Treat 'indeterminate' as 'false' for form state update.
                  const newValue = checked === true;

                  // Update the current field's state with the definite boolean value
                  field.onChange(newValue);

                  // --- Reset Logic ---
                  // If the new value is false (meaning checkbox was unchecked)
                  if (!newValue) {
                    fieldsToResetOnUncheck?.forEach((item) => {
                      item.fieldsToReset.forEach((fieldToReset) => {
                        // Use resetToValue from config if provided, otherwise default to undefined
                        const valueToSet =
                          item.resetToValue !== undefined
                            ? item.resetToValue
                            : undefined;
                        setValue(fieldToReset, valueToSet, {
                          shouldValidate: false, // Avoid immediate validation on reset
                          shouldDirty: true, // Mark form as dirty
                        });
                      });
                    });
                  }
                }}
                disabled={disabled || formState.disabled}
              // Link label and checkbox implicitly via FormItem/FormLabel or explicitly via aria-labelledby if needed
              // aria-label={label} // Can be used if label text isn't sufficient
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              {/* Clicking label should also toggle checkbox */}
              <FormLabel className="cursor-pointer">{label}</FormLabel>
              {description && (
                // Let description flow normally
                <FormDescription>{description}</FormDescription>
              )}
            </div>
            {/* Display validation errors associated with this field */}
            {/* Note: FormMessage needs to be outside the label div to appear correctly */}
            {/* However, RHF typically places it relative to FormItem */}
            {/* Let's add it here for completeness, adjust styling if needed */}
            {/* <FormMessage className="absolute -bottom-4 left-0 text-xs" /> */}
            {/* Or rely on default FormItem placement */}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default CheckboxField;
