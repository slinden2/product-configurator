"use client";

import type * as React from "react";
import {
  type FieldPath,
  type FieldValues,
  useFormContext,
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
  suffix?: string;
}

const InputField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  placeholder,
  type = "text",
  disabled,
  suffix,
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
            {suffix ? (
              <div className="relative">
                <FormControl>
                  <Input
                    type={type}
                    placeholder={placeholder}
                    className="bg-background pr-10"
                    disabled={disabled}
                    {...field}
                    {...inputProps}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                  {suffix}
                </span>
              </div>
            ) : (
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
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default InputField;
