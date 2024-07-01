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
import { ConfigFormData } from "@/components/ConfigForm";

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
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <Select
              value={field.value}
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
                        setValue(fieldToReset, "");
                      });
                    }
                  });
                });
                return field.onChange(val);
              }}
              disabled={disabled}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selezionare..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {items.map((item) => {
                  return (
                    <SelectItem key={item.value} value={item.value}>
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
