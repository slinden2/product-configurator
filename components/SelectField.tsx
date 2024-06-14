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
  name: keyof ConfigFormData;
  label: string;
  placeholder: string;
  description?: string;
  className?: string;
  disabled?: boolean;
  items: SelectOption[];
  fieldsToResetOnValue?: {
    triggerValue: string | number;
    fieldsToReset: Array<keyof ConfigFormData>;
  };
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
                if (val == fieldsToResetOnValue?.triggerValue) {
                  fieldsToResetOnValue.fieldsToReset.forEach((fieldName) => {
                    resetField(fieldName);
                  });
                }
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
