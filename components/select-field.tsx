import * as React from "react";
import { useFormContext } from "react-hook-form";
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
import { ConfigFormData } from "@/components/config-form";
import { NOT_SELECTED_LABEL } from "@/lib/utils";

interface SelectFieldProps {
  name: keyof ConfigFormData; // Name of the field in your form data (used for form state management)
  label: string; // Label displayed above the select input
  description?: string; // Optional description displayed below the select input
  disabled?: boolean;
  items: SelectOption[]; // Array of options to display in the select input
  fieldsToResetOnValue?: Array<{
    // (IMPORTANT) Array of fields to reset when a specific value is selected
    triggerValue: string | string[] | number | number[]; // The value that triggers the reset of other fields
    fieldsToReset: Array<keyof ConfigFormData>; // Array of field names to reset
    invertTrigger?: boolean; // If true, resets fields when the value is NOT equal to triggerValue (default: false)
  }>;
}

const SelectField = ({
  name,
  label,
  description,
  disabled,
  items,
  fieldsToResetOnValue,
}: SelectFieldProps) => {
  const { control, setValue } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // Convert the field value to a string. This is necessary because the Select component expects a string value.
        // If the value is undefined or null, it will be converted to an empty string.
        const stringValue =
          field.value || field.value === 0 ? field.value.toString() : "";
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select
              value={stringValue}
              onValueChange={(val) => {
                fieldsToResetOnValue?.forEach((item) => {
                  const triggerValues = Array.isArray(item.triggerValue)
                    ? item.triggerValue
                    : [item.triggerValue];

                  triggerValues.forEach((triggerValue) => {
                    const shouldReset = item.invertTrigger
                      ? val !== triggerValue.toString()
                      : val === triggerValue.toString();

                    if (shouldReset) {
                      item.fieldsToReset.forEach((fieldToReset) => {
                        setValue(fieldToReset, null);
                      });
                    }
                  });
                });
                return field.onChange(val === "null" ? null : val);
              }}
              disabled={disabled}>
              <FormControl>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={NOT_SELECTED_LABEL} />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="bg-background">
                {items.map((item) => {
                  return (
                    <SelectItem key={item.value} value={item.value.toString()}>
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
