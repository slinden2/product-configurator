"use client";

import type * as React from "react";
import {
  type FieldPath,
  type FieldValues,
  useFormContext,
} from "react-hook-form";
import { useFormDisabled } from "@/components/shared/form-disabled-context";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface TextareaFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<
    React.ComponentProps<"textarea">,
    // Also omit the RHF-controlled props so a caller cannot silently detach
    // the field from react-hook-form (textareaProps spread after {...field}).
    | "name"
    | "disabled"
    | "placeholder"
    | "onChange"
    | "onBlur"
    | "value"
    | "defaultValue"
    | "ref"
  > {
  name: FieldPath<TFieldValues>;
  label: string;
  placeholder?: string;
  disabled?: boolean;
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
  ...textareaProps
}: TextareaFieldProps<TFieldValues>) => {
  const { control } = useFormContext<TFieldValues>();
  const formDisabled = useFormDisabled();

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
                disabled={disabled || formDisabled}
                {...field}
                {...textareaProps}
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
