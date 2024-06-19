"use client";

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
  placeholder: string;
  description?: string; // Optional description displayed below the select input
  className?: string;
  disabled?: boolean;
  items: SelectOption[]; // Array of options to display in the select input
  fieldsToResetOnValue?: Array<{
    // (IMPORTANT) Array of fields to reset when a specific value is selected
    triggerValue: string | number; // The value that triggers the reset of other fields
    fieldsToReset: Array<keyof ConfigFormData>; // Array of field names to reset
    invertTrigger?: boolean; // If true, resets fields when the value is NOT equal to triggerValue (default: false)
  }>;
}

const SelectField = ({
  name,
  label,
  placeholder,
  description,
  className,
  disabled,
  items,
  fieldsToResetOnValue,
}: SelectFieldProps) => {
  const { control, resetField } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        return (
          <FormItem className={className}>
            <FormLabel>{label}</FormLabel>
            <Select
              onValueChange={(val) => {
                fieldsToResetOnValue?.forEach((item) => {
                  const cond = item.invertTrigger
                    ? val != item.triggerValue
                    : val == item.triggerValue;
                  if (cond) {
                    item.fieldsToReset.forEach((fieldName) => {
                      resetField(fieldName);
                    });
                  }
                });
                return field.onChange(val);
              }}
              defaultValue={field.value}>
              <FormControl>
                <SelectTrigger disabled={disabled}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
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
