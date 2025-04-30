"use client";

import * as React from "react";
import { useFormContext, FieldValues, FieldPath } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface TextareaFieldProps<TFieldValues extends FieldValues = FieldValues> {
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
}

/**
 * A reusable TextareaField component integrated with React Hook Form.
 * Uses generics for type safety.
 */
const TextareaField = <TFieldValues extends FieldValues = FieldValues>({
  name,
  label,
  placeholder,
  disabled,
  rows,
}: TextareaFieldProps<TFieldValues>) => {
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
              <Textarea
                placeholder={placeholder}
                className="bg-background resize-y"
                disabled={disabled}
                rows={rows}
                {...field}
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

export default TextareaField;
