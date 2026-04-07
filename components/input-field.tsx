"use client";

import type * as React from "react";
import {
  useFormContext,
  type FieldValues,
  type FieldPath,
} from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface InputFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<
    React.ComponentProps<"input">,
    "name" | "type" | "disabled" | "placeholder"
  > {
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  disabled?: boolean;
}

const InputField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  placeholder,
  type = "text",
  disabled,
  ...inputProps
}: InputFieldProps<TFieldValues>) => {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                type={type}
                placeholder={placeholder}
                className="bg-background"
                disabled={disabled}
                {...field}
                {...inputProps}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default InputField;
