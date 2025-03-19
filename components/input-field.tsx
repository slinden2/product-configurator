"use client";

import * as React from "react";
import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ConfigFormData } from "@/components/config-form";
import { LoginFormData, NewPassWordFormData } from "@/validation/auth-schema";

interface InputFieldProps {
  name: keyof ConfigFormData | keyof LoginFormData | keyof NewPassWordFormData;
  label: string;
  placeholder: string;
  type?: string;
}

const InputField = ({ name, label, placeholder, type }: InputFieldProps) => {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name.toString()}
      defaultValue=""
      render={({ field }) => {
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                type={type ? type : "text"}
                placeholder={placeholder}
                {...field}
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
