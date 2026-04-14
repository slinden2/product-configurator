import type { CheckedState } from "@radix-ui/react-checkbox"; // Import type for clarity
import type * as React from "react";
import {
  type FieldPath,
  type FieldValues,
  type PathValue,
  useFormContext,
} from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormDisabled,
} from "@/components/ui/form";

// Interface for the reset configuration, using generics
interface ResetCheckboxConfig<TFieldValues extends FieldValues> {
  fieldsToReset: Array<FieldPath<TFieldValues>>; // Fields to reset (type-safe)
  resetToValue?: unknown; // Value to reset the fields to (defaults to undefined)
}

// --- CheckboxField Props Interface with Generics ---
interface CheckboxFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: FieldPath<TFieldValues>; // Type-safe field name
  label: string;
  description?: React.ReactNode;
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
  const { control, setValue, trigger } = useFormContext<TFieldValues>();
  const formDisabled = useFormDisabled();

  return (
    <FormField
      control={control}
      name={name} // Pass the generic name directly
      render={({ field }) => {
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
                  field.onBlur(); // Mark field as touched for validation

                  // --- Reset / Revalidate Logic ---
                  if (!newValue) {
                    // Unchecked: reset dependent fields so their values are cleared
                    fieldsToResetOnUncheck?.forEach((item) => {
                      item.fieldsToReset.forEach((fieldToReset) => {
                        const valueToSet = (item.resetToValue ??
                          undefined) as PathValue<
                          TFieldValues,
                          FieldPath<TFieldValues>
                        >;
                        setValue(fieldToReset, valueToSet, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      });
                    });
                  } else {
                    // Checked: re-validate dependent fields so any stale errors
                    // from when the checkbox was off are cleared now that the
                    // discriminated-union branch has switched to the "true" schema.
                    fieldsToResetOnUncheck?.forEach((item) => {
                      item.fieldsToReset.forEach((fieldToReset) => {
                        void trigger(fieldToReset);
                      });
                    });
                  }
                }}
                disabled={disabled || formDisabled}
                // Link label and checkbox implicitly via FormItem/FormLabel or explicitly via aria-labelledby if needed
                // aria-label={label} // Can be used if label text isn't sufficient
              />
            </FormControl>
            <div className="leading-none">
              {/* Clicking label should also toggle checkbox */}
              <FormLabel className="cursor-pointer">{label}</FormLabel>
              {description && (
                <FormDescription className="mt-1.5">
                  {description}
                </FormDescription>
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
