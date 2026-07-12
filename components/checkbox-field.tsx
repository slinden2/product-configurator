import type { CheckedState } from "@radix-ui/react-checkbox";
import type * as React from "react";
import {
  type FieldPath,
  type FieldValues,
  type PathValue,
  useFormContext,
} from "react-hook-form";
import { useFormDisabled } from "@/components/shared/form-disabled-context";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

interface ResetCheckboxConfig<TFieldValues extends FieldValues> {
  fieldsToReset: Array<FieldPath<TFieldValues>>;
  // `unknown` because fieldsToReset is heterogeneous — a single per-field
  // value type isn't expressible here; callers must match the Zod schema type.
  resetToValue?: unknown;
}

interface CheckboxFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: FieldPath<TFieldValues>;
  label: string;
  description?: React.ReactNode;
  disabled?: boolean;
  fieldsToResetOnUncheck?: Array<ResetCheckboxConfig<TFieldValues>>;
}

/**
 * A reusable CheckboxField component integrated with React Hook Form.
 * Ensures that the form state is updated with a boolean value (true/false),
 * reducing the need for Zod coercion for checkbox inputs.
 *
 * `fieldsToResetOnUncheck` drives both directions of the dependency:
 * on uncheck the listed fields are reset; on check they are re-validated,
 * clearing errors left over from the unchecked discriminated-union branch.
 */
const CheckboxField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  description,
  disabled,
  fieldsToResetOnUncheck,
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
              {/* field.ref lets RHF focus this field on validation error */}
              <Checkbox
                ref={field.ref}
                checked={isChecked}
                onCheckedChange={(checked: CheckedState) => {
                  // CheckedState is boolean | 'indeterminate'; the schema
                  // expects a definite boolean, so 'indeterminate' maps to false.
                  const newValue = checked === true;

                  field.onChange(newValue);
                  field.onBlur();

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
              />
            </FormControl>
            <div className="leading-none">
              <FormLabel className="cursor-pointer">{label}</FormLabel>
              {description && (
                <FormDescription className="mt-1.5">
                  {description}
                </FormDescription>
              )}
              {/* Inside the label column so the error renders below the
                  label instead of as a third column of the flex row */}
              <FormMessage className="mt-1.5" />
            </div>
          </FormItem>
        );
      }}
    />
  );
};

export default CheckboxField;
