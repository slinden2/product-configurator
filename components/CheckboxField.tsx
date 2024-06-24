import { ConfigFormData } from "@/components/ConfigForm";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import React from "react";
import { useFormContext } from "react-hook-form";

interface CheckboxFieldProps {
  name: keyof ConfigFormData;
  label: string;
  description?: string;
  containerClassName?: string;
  fieldsToResetOnUncheck?: Array<keyof ConfigFormData>;
}

const CheckboxField = ({
  name,
  label,
  description,
  containerClassName,
  fieldsToResetOnUncheck,
}: CheckboxFieldProps) => {
  const { control, setValue } = useFormContext();
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        if (field.value === undefined) field.value = false;
        return (
          <div className={containerClassName}>
            <div>
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(val) => {
                      if (val === false) {
                        fieldsToResetOnUncheck?.forEach((fieldToReset) => {
                          setValue(fieldToReset, "");
                        });
                      }
                      return field.onChange(val);
                    }}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{label}</FormLabel>
                  {description && (
                    <FormDescription>{description}</FormDescription>
                  )}
                </div>
              </FormItem>
            </div>
          </div>
        );
      }}
    />
  );
};

export default CheckboxField;
