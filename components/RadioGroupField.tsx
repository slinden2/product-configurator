import { ConfigFormData } from "@/components/ConfigForm";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SelectOption } from "@/types";
import React from "react";
import { useFormContext } from "react-hook-form";

interface RadioGroupFieldProps {
  name: keyof ConfigFormData;
  label: string;
  defaultValue?: string;
  items: SelectOption[];
}

const RadioGroupField = ({
  name,
  label,
  defaultValue,
  items,
}: RadioGroupFieldProps) => {
  const { control } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      defaultValue={defaultValue}
      render={({ field }) => {
        return (
          <div>
            <FormItem className="space-y-2">
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="md:flex space-y-1 md:gap-4">
                  {items.map((item) => {
                    return (
                      <FormItem
                        key={item.value}
                        className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value={item.value.toString()} />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    );
                  })}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          </div>
        );
      }}
    />
  );
};

export default RadioGroupField;
